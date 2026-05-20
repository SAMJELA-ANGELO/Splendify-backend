import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Payment as PrismaPayment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { PlansService } from '../plans/plans.service';
import { MikrotikService } from '../mikrotik/mikrotik.service';
import type { RouterProvider } from '../router/router-provider.interface';
import { Inject } from '@nestjs/common';
import { ActivitiesService } from '../activities/activities.service';
import { VoucherService } from './voucher.service';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { tryDecryptSecret } from '../common/encryption.util';
import { parsePhoneNumber } from 'libphonenumber-js';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PaymentsService {
  private logger = new Logger('PaymentsService');
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private plansService: PlansService,
    private mikrotikService: MikrotikService,
    private activitiesService: ActivitiesService,
    private voucherService: VoucherService,
    private configService: ConfigService,
    @Inject('RouterProvider') private routerProvider?: RouterProvider,
  ) {}

  async initiatePayment(
    tenantId: string,
    userId: string,
    planId: string,
    email?: string,
    phone?: string,
    externalId?: string,
    name?: string,
    macAddress?: string,
    routerIdentity?: string,
    isGift?: boolean,
    recipientUsername?: string,
    userIp?: string,
    password?: string,
  ) {
    this.logger.log(
      `💶 Initiating payment for user ${userId}, plan ${planId} (Tenant: ${tenantId})`,
    );

    // Transaction Lock: Check for existing pending transactions
    if (phone || macAddress) {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const existingPending = await this.prisma.payment.findFirst({
        where: {
          status: 'pending',
          createdAt: {
            gte: tenMinutesAgo,
          },
          OR: [
            ...(phone ? [{ phone }] : []),
            ...(macAddress ? [{ macAddress }] : []),
          ],
        },
      });
      if (existingPending) {
        throw new Error(
          'Please complete or cancel your existing payment attempt before starting a new one.',
        );
      }
    }

    // Phone Number Validation and Strike System
    if (phone) {
      // Validate phone number format
      const { parsePhoneNumber } = await import('libphonenumber-js');
      const phoneNumber = parsePhoneNumber(phone, 'CM');
      if (!phoneNumber.isValid() || phoneNumber.country !== 'CM') {
        throw new Error('Phone number must be a valid Cameroon number (+237... or 6...)');
      }

      // Check for strike system: if MAC address has used 3 different phones in 1 hour
      if (macAddress) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentPayments = await this.prisma.payment.findMany({
          where: {
            macAddress,
            createdAt: { gte: oneHourAgo },
          },
          select: { phone: true },
        });
        const uniquePhones = new Set(recentPayments.map(p => p.phone).filter(Boolean));
        if (uniquePhones.size >= 3 && !uniquePhones.has(phone)) {
          // Blacklist the MAC address for 24 hours
          await this.prisma.blacklist.create({
            data: {
              type: 'MAC',
              value: macAddress,
              reason: 'Multiple phone numbers used within 1 hour',
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          });
          throw new Error('Device has been temporarily blocked due to suspicious activity');
        }
      }
    }

    try {
      this.logger.log(`  1️⃣ Fetching plan: ${planId}`);
      const plan = await this.plansService.findById(tenantId, planId);
      if (!plan) throw new Error('Plan not found');
      this.logger.log(
        `  ✅ Plan found: ${plan.name} (${plan.price} XAF, ${plan.duration}h)`,
      );

      // Validation
      if (!phone)
        throw new Error('Phone number is required for direct payment');
      const planAmount = Number(plan.price);
      if (!Number.isInteger(planAmount)) {
        throw new Error('Amount must be an integer');
      }
      if (planAmount < 100) {
        throw new Error('Amount cannot be less than 100 XAF');
      }
      this.logger.log(`  ✅ Validation passed`);

      // Build request payload for directPay
      this.logger.log(`  2️⃣ Building Fapshi payment request for ${phone}`);

      // HYBRID BILLING: Load tenant payment configuration
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });
      if (!tenant) throw new Error('Tenant not found');

      const paymentModel = tenant.paymentModel;
      this.logger.log(`  🏢 Effective payment model: ${paymentModel}`);

      // Select API credentials based on payment model
      let fapshiApiKey: string;
      let fapshiApiUser: string;
      let fapshiBaseUrl: string;

      if (paymentModel === 'DIRECT') {
        // DIRECT mode: Use ISP's own Fapshi API keys
        const apiKey = tryDecryptSecret(tenant.fapshiApiKey || null);
        const apiUser = tryDecryptSecret(tenant.fapshiServiceId || null);
        if (!apiKey || !apiUser) {
          throw new Error(
            'DIRECT payment mode requires Fapshi API configuration. Please contact support.',
          );
        }
        fapshiApiKey = apiKey;
        fapshiApiUser = apiUser; // ServiceId acts as API user in DIRECT mode
        fapshiBaseUrl = this.configService.get<string>('FAPSHI_BASE_URL') || '';
        this.logger.log(`  💳 DIRECT MODE: Using tenant's Fapshi API keys`);
      } else {
        // ESCROW mode: Use XenFi master account
        fapshiApiKey = this.configService.get<string>('FAPSHI_APIKEY') || '';
        fapshiApiUser = this.configService.get<string>('FAPSHI_APIUSER') || '';
        fapshiBaseUrl = this.configService.get<string>('FAPSHI_BASE_URL') || '';
        this.logger.log(`  🏦 ESCROW MODE: Using XenFi master account`);
      }

      if (!fapshiApiKey || !fapshiApiUser || !fapshiBaseUrl) {
        throw new Error('Missing Fapshi API configuration');
      }

      const paymentData: any = {
        amount: planAmount + planAmount * 0.04, // Add 4% fee
        phone: phone,
        userId: userId,
      };

      if (email) {
        // Sanitize email: trim whitespace and validate basic format
        const sanitizedEmail = email.trim();
        if (
          sanitizedEmail &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)
        ) {
          paymentData.email = sanitizedEmail;
        } else {
          this.logger.warn(
            `⚠️ Invalid email format: "${email}", skipping email in payment request`,
          );
        }
      }
      if (externalId) paymentData.externalId = externalId;
      if (name) paymentData.name = name;

      // Call Fapshi API directPay endpoint (sends payment to mobile)
      this.logger.log(`  3️⃣ Calling Fapshi direct-pay API`);
      const fapshiResponse = await axios.post(
        `${fapshiBaseUrl}/direct-pay`,
        paymentData,
        {
          headers: {
            'Content-Type': 'application/json',
            apiuser: fapshiApiUser,
            apikey: fapshiApiKey,
          },
          timeout: 10000,
        },
      );
      this.logger.log(
        `  ✅ Fapshi response received: TransID ${fapshiResponse.data.transId}`,
      );

      // Create and save payment record
      this.logger.log(`  4️⃣ Saving payment record to PostgreSQL`);
      const grossAmount = planAmount + planAmount * 0.04; // Amount with fees
      const payment = await this.prisma.payment.create({
        data: {
          tenantId,
          userId,
          planId,
          amount: planAmount,
          grossAmount: grossAmount,
          email,
          phone,
          externalId,
          macAddress,
          routerIdentity,
          userIp,
          password,
          isGift: isGift || false,
          recipientUsername: recipientUsername || null,
          status: (fapshiResponse.data.status || 'created').toLowerCase(),
          fapshiTransactionId: fapshiResponse.data.transId,
          fapshiResponse: fapshiResponse.data,
          paymentModel,
        },
      });

      if (macAddress) this.logger.log(`  📌 MAC address saved: ${macAddress}`);
      if (userIp) this.logger.log(`  🌐 User IP saved: ${userIp}`);
      if (routerIdentity)
        this.logger.log(`  🛰️ Router identity saved: ${routerIdentity}`);
      if (password) this.logger.log(`  🔐 Password saved for silent login`);
      if (isGift && recipientUsername) {
        this.logger.log(
          `  🎁 Gift payment for recipient: ${recipientUsername}`,
        );
      }

      this.logger.log(
        `✅ Payment initiated successfully: ${fapshiResponse.data.transId}`,
      );

      // Start background polling for webhook fallback
      this.pollFapshiStatus(payment.fapshiTransactionId)
        .then((res) => {
          if (res && res.status) {
            this.logger.log(
              `📡 Polling complete for ${payment.fapshiTransactionId} -> ${res.status}`,
            );
          } else {
            this.logger.warn(
              `⌛ Polling complete for ${payment.fapshiTransactionId} with no terminal status`,
            );
          }
        })
        .catch((err) => {
          this.logger.error(
            `❌ Polling error for ${payment.fapshiTransactionId}: ${err.message}`,
          );
        });

      return {
        paymentId: payment.id,
        transId: fapshiResponse.data.transId,
        message:
          'Payment request sent to your mobile phone. Please complete payment on your device.',
      };
    } catch (error: any) {
      this.logger.error(
        `❌ Payment initiation failed for user ${userId}: ${error.message}`,
      );

      // Convert Fapshi errors to user-friendly messages
      let userFriendlyMessage = 'Payment initiation failed. Please try again.';

      if (error.response) {
        // Fapshi returned an error response
        const fapshiError = error.response.data;
        this.logger.error(`❌ Fapshi error response:`, fapshiError);

        if (fapshiError.message) {
          const errorMsg = fapshiError.message.toLowerCase();

          if (
            errorMsg.includes('invalid phone') ||
            errorMsg.includes('phone number')
          ) {
            userFriendlyMessage =
              'Invalid phone number. Please check the format and try again.';
          } else if (
            errorMsg.includes('insufficient balance') ||
            errorMsg.includes('balance')
          ) {
            userFriendlyMessage =
              'Insufficient account balance. Please top up and try again.';
          } else if (
            errorMsg.includes('unauthorized') ||
            errorMsg.includes('authentication')
          ) {
            userFriendlyMessage =
              'Payment service temporarily unavailable. Please try again later.';
          } else if (
            errorMsg.includes('timeout') ||
            errorMsg.includes('network')
          ) {
            userFriendlyMessage =
              'Payment request timed out. Please check your connection and try again.';
          } else if (
            errorMsg.includes('amount') &&
            errorMsg.includes('invalid')
          ) {
            userFriendlyMessage =
              'Invalid payment amount. Please select a valid plan.';
          } else {
            // Use Fapshi's message if it's user-friendly, otherwise use generic
            userFriendlyMessage =
              fapshiError.message.length < 100
                ? fapshiError.message
                : userFriendlyMessage;
          }
        } else if (fapshiError.error) {
          // Some Fapshi errors have an 'error' field
          const errorMsg = fapshiError.error.toLowerCase();
          if (errorMsg.includes('phone')) {
            userFriendlyMessage =
              'Invalid phone number format. Please use a valid Cameroon mobile number.';
          } else if (errorMsg.includes('amount')) {
            userFriendlyMessage =
              'Invalid payment amount. Please select a different plan.';
          }
        }
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        userFriendlyMessage =
          'Payment service is currently unavailable. Please try again in a few minutes.';
      } else if (error.code === 'ETIMEDOUT') {
        userFriendlyMessage =
          'Payment request timed out. Please check your internet connection and try again.';
      }

      // Create a new error with user-friendly message
      const userError = new Error(userFriendlyMessage);
      userError.name = 'PaymentError';
      throw userError;
    }
  }

  async initiateTenantSubscriptionPayment(
    tenantId: string,
    optionId: string,
    amount: number,
    phone: string,
    email?: string,
    externalId?: string,
    name?: string,
    userIp?: string,
    tenantSubscriptionId?: string,
  ) {
    this.logger.log(
      `💳 Initiating tenant subscription payment for tenant ${tenantId} and option ${optionId}`,
    );

    if (!phone) {
      throw new Error(
        'Phone number is required for tenant subscription payment',
      );
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const option = await this.prisma.tenantRentalOption.findUnique({
      where: { id: optionId },
    });
    if (!option) {
      throw new Error('Subscription option not found');
    }

    const fapshiApiKey = this.configService.get<string>('FAPSHI_APIKEY') || '';
    const fapshiApiUser =
      this.configService.get<string>('FAPSHI_APIUSER') || '';
    const fapshiBaseUrl =
      this.configService.get<string>('FAPSHI_BASE_URL') || '';

    if (!fapshiApiKey || !fapshiApiUser || !fapshiBaseUrl) {
      throw new Error('Missing platform Fapshi API configuration');
    }

    const paymentData: any = {
      amount: amount + amount * 0.04,
      phone,
      userId: null,
    };

    if (email) paymentData.email = email;
    if (externalId) paymentData.externalId = externalId;
    if (name) paymentData.name = name;

    const fapshiResponse = await axios.post(
      `${fapshiBaseUrl}/direct-pay`,
      paymentData,
      {
        headers: {
          'Content-Type': 'application/json',
          apiuser: fapshiApiUser,
          apikey: fapshiApiKey,
        },
        timeout: 10000,
      },
    );

    const grossAmount = amount + amount * 0.04;
    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        userId: null,
        planId: null,
        amount,
        grossAmount,
        email,
        phone,
        externalId,
        userIp,
        status: (fapshiResponse.data.status || 'created').toLowerCase(),
        fapshiTransactionId: fapshiResponse.data.transId,
        fapshiResponse: fapshiResponse.data,
        paymentModel: 'ESCROW',
        paymentPurpose: 'TENANT_RENTAL',
        tenantSubscriptionId,
      },
    });

    return {
      paymentId: payment.id,
      transId: fapshiResponse.data.transId,
      amount,
      message:
        'Tenant subscription payment request sent. Please complete the payment on your device.',
    };
  }

  async checkPaymentStatus(transactionId: string) {
    this.logger.log(
      `🔍 Checking payment status for transaction: ${transactionId}`,
    );
    try {
      this.logger.log(`  1️⃣ Querying Fapshi API for status`);
      const response = await axios.get(
        `${this.configService.get('FAPSHI_BASE_URL')}/payment-status/${transactionId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            apiuser: this.configService.get('FAPSHI_APIUSER'),
            apikey: this.configService.get('FAPSHI_APIKEY'),
          },
          timeout: 10000,
        },
      );
      this.logger.log(
        `  ✅ Status received from Fapshi: ${response.data.status}`,
      );

      this.logger.log(`  2️⃣ Looking up payment record in database`);
      const payment = await this.prisma.payment.findFirst({
        where: { fapshiTransactionId: transactionId },
      });
      if (!payment) {
        this.logger.warn(`  ⚠️ Payment not found in database`);
        return response.data;
      }
      this.logger.log(`  ✅ Payment found in database`);

      // Update payment status (normalize to enum: lowercase for initial states)
      this.logger.log(`  3️⃣ Updating payment status in database`);
      const statusValue = response.data.status;
      const normalizedStatus =
        statusValue &&
        ['created', 'pending'].includes(statusValue.toLowerCase())
          ? statusValue.toLowerCase()
          : statusValue;

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: normalizedStatus,
          fapshiResponse: response.data,
        },
      });
      this.logger.log(`  ✅ Payment status updated: ${normalizedStatus}`);

      // Activate user if payment succeeded
      if (response.data.status === 'SUCCESSFUL') {
        this.logger.log(`  4️⃣ Payment successful - activating user access`);
        const activationResult = await this.activateUserAccess(payment);
        this.logger.log(`✅ Payment status check complete: ${transactionId}`);
        return {
          ...response.data,
          activation: activationResult,
          isGift: payment.isGift,
          recipientUsername: payment.recipientUsername,
          message:
            activationResult?.message || 'Payment completed and user activated',
        };
      }

      this.logger.log(`✅ Payment status check complete: ${transactionId}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `❌ Payment status check failed for ${transactionId}: ${error.message}`,
      );

      // Convert Fapshi errors to user-friendly messages for status checks
      let userFriendlyMessage =
        'Unable to check payment status. Please try again.';

      if (error.response) {
        const fapshiError = error.response.data;
        this.logger.error(`❌ Fapshi status check error:`, fapshiError);

        if (fapshiError.message) {
          const errorMsg = fapshiError.message.toLowerCase();

          if (
            errorMsg.includes('not found') ||
            errorMsg.includes('transaction')
          ) {
            userFriendlyMessage =
              'Payment transaction not found. It may have expired.';
          } else if (
            errorMsg.includes('timeout') ||
            errorMsg.includes('network')
          ) {
            userFriendlyMessage =
              'Payment status check timed out. Please check your connection.';
          } else {
            userFriendlyMessage =
              fapshiError.message.length < 100
                ? fapshiError.message
                : userFriendlyMessage;
          }
        }
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        userFriendlyMessage =
          'Payment service is currently unavailable. Please try again later.';
      } else if (error.code === 'ETIMEDOUT') {
        userFriendlyMessage =
          'Payment status check timed out. Please try again.';
      }

      const userError = new Error(userFriendlyMessage);
      userError.name = 'PaymentStatusError';
      throw userError;
    }
  }

  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async pollFapshiStatus(
    transactionId: string,
    intervalMs = 2000,
    timeoutMs = 180000,
  ) {
    this.logger.log(
      `🔁 Starting polling for Fapshi status fallback: ${transactionId}`,
    );
    const maxAttempts = Math.ceil(timeoutMs / intervalMs);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      this.logger.log(
        `  ⏱️ Poll attempt ${attempt}/${maxAttempts} for ${transactionId}`,
      );
      try {
        const result = await this.checkPaymentStatus(transactionId);
        const status = result?.status?.toString?.().toUpperCase?.();

        if (
          status === 'SUCCESSFUL' ||
          status === 'FAILED' ||
          status === 'EXPIRED'
        ) {
          this.logger.log(
            `  ✅ Terminal status reached for ${transactionId}: ${status}`,
          );
          return { status, result };
        }

        this.logger.log(
          `  ⏳ Current status for ${transactionId}: ${status || 'unknown'}`,
        );
      } catch (error: any) {
        this.logger.warn(
          `  ⚠️ Poll attempt ${attempt} failed for ${transactionId}: ${error.message}`,
        );
      }

      if (attempt < maxAttempts) {
        await this.sleep(intervalMs);
      }
    }

    this.logger.warn(
      `⌛ Polling timeout reached for ${transactionId} after ${timeoutMs / 1000}s`,
    );
    return null;
  }

  async handleWebhookNotification(data: any) {
    this.logger.log(`🔔 Webhook notification received: ${data.transId}`);
    try {
      // Validate transId format
      if (!data?.transId || typeof data.transId !== 'string') {
        throw new Error('Invalid transId');
      }
      if (!/^[a-zA-Z0-9]{8,10}$/.test(data.transId)) {
        throw new Error('Invalid transaction id format');
      }
      this.logger.log(`  ✅ TransId format validated: ${data.transId}`);

      // Get the transaction status from Fapshi API to verify source
      this.logger.log(`  1️⃣ Verifying transaction with Fapshi API`);
      const statusResponse = await axios.get(
        `${this.configService.get('FAPSHI_BASE_URL')}/payment-status/${data.transId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            apiuser: this.configService.get('FAPSHI_APIUSER'),
            apikey: this.configService.get('FAPSHI_APIKEY'),
          },
          timeout: 10000,
        },
      );
      this.logger.log(
        `  ✅ Fapshi verification complete: ${statusResponse.data.status}`,
      );

      this.logger.log(`  2️⃣ Looking up payment in database`);
      const payment = await this.prisma.payment.findFirst({
        where: { fapshiTransactionId: data.transId },
        include: { user: true, tenant: true, plan: true },
      });
      if (!payment) {
        this.logger.warn(`  ⚠️ Payment not found for transId: ${data.transId}`);
        return { success: false, message: 'Payment not found' };
      }
      this.logger.log(
        `  ✅ Payment found: User ${payment.userId} (Tenant: ${payment.tenantId})`,
      );

      // IMPORTANT: Ensure webhook handles multi-tenant context correctly
      this.logger.log(
        `  🏢 Tenant Context: ${payment.tenantId} | User: ${payment.user?.username || 'unknown'}`,
      );

      // Update payment status (normalize to enum: lowercase for initial states)
      this.logger.log(`  3️⃣ Updating payment status`);
      const statusValue = statusResponse.data.status;
      const normalizedStatus =
        statusValue &&
        ['created', 'pending'].includes(statusValue.toLowerCase())
          ? statusValue.toLowerCase()
          : statusValue;

      const updatedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: normalizedStatus,
          fapshiResponse: statusResponse.data,
        },
        include: { user: true, tenant: true, plan: true },
      });
      this.logger.log(`  ✅ Payment status updated: ${updatedPayment.status}`);

      // Handle different statuses
      this.logger.log(`  4️⃣ Processing payment result`);
      switch (statusResponse.data.status) {
        case 'SUCCESSFUL':
          this.logger.log(
            `  ✅ Payment SUCCESSFUL - Processing for ${payment.tenantId} (Purpose: ${payment.paymentPurpose})`,
          );

          if (payment.paymentPurpose === 'TENANT_RENTAL') {
            this.logger.log(
              `  🏢 TENANT RENTAL PAYMENT: Activating subscription for tenant ${payment.tenantId}`,
            );

            const subscription = payment.tenantSubscriptionId
              ? await this.prisma.tenantSubscription.findUnique({
                  where: { id: payment.tenantSubscriptionId },
                })
              : await this.prisma.tenantSubscription.findFirst({
                  where: {
                    tenantId: payment.tenantId,
                    status: 'PENDING',
                  },
                  orderBy: { createdAt: 'desc' },
                });

            if (subscription) {
              await this.prisma.tenantSubscription.update({
                where: { id: subscription.id },
                data: {
                  status: 'ACTIVE',
                },
              });
              this.logger.log(
                `    ✅ Tenant subscription activated: ${subscription.id}`,
              );
            } else {
              this.logger.warn(
                `    ⚠️ No pending tenant subscription found for payment ${payment.id}`,
              );
            }

            return {
              success: true,
              status: statusResponse.data.status,
              tenantId: payment.tenantId,
              paymentPurpose: payment.paymentPurpose,
              message: 'Tenant subscription payment completed successfully.',
            };
          }

          // HYBRID BILLING: Handle ESCROW mode special processing for user plan payments
          if (payment.paymentModel === 'ESCROW') {
            this.logger.log(
              `  💰 ESCROW MODE: Recording transaction and updating tenant balance`,
            );

            const platformFeePercent = 0.05; // 5% platform commission
            const grossAmount = Number(payment.amount);
            const platformFee = grossAmount * platformFeePercent;
            const tenantNetAmount = grossAmount - platformFee;

            this.logger.log(`    📊 Transaction breakdown:`);
            this.logger.log(`       Gross amount: ${grossAmount} XAF`);
            this.logger.log(`       Platform fee (5%): ${platformFee} XAF`);
            this.logger.log(`       Tenant net: ${tenantNetAmount} XAF`);

            try {
              // Create billing transaction for transparency and auditing
              await this.prisma.billingTransaction.create({
                data: {
                  tenantId: payment.tenantId,
                  paymentId: payment.id,
                  transactionType: 'PAYMENT',
                  originalAmount: grossAmount,
                  commissionRate: platformFeePercent,
                  commissionAmount: platformFee,
                  netAmount: tenantNetAmount,
                  description: `Payment from user ${payment.userId} for plan ${payment.planId}`,
                },
              });
              this.logger.log(`    ✅ Billing transaction created`);

              const prismaAny = this.prisma as any;
              try {
                await prismaAny.balanceTransaction.create({
                  data: {
                    tenantId: payment.tenantId,
                    paymentId: payment.id,
                    amount: grossAmount,
                    fee: platformFee,
                    netAmount: tenantNetAmount,
                    transactionType: 'PAYMENT',
                    description: `ESCROW payment ledger entry for payment ${payment.id}`,
                  },
                });
                this.logger.log(`    ✅ Balance transaction recorded`);
              } catch (ledgerError: any) {
                this.logger.warn(
                  `⚠️ Failed to record balance transaction: ${ledgerError.message}`,
                );
              }

              // Update tenant's escrow balance
              const tenant = await this.prisma.tenant.findUnique({
                where: { id: payment.tenantId },
              });
              const newBalance =
                Number(tenant?.escrowBalance || 0) + tenantNetAmount;

              await this.prisma.tenant.update({
                where: { id: payment.tenantId },
                data: {
                  escrowBalance: newBalance,
                  totalGrossRevenue:
                    Number(tenant?.totalGrossRevenue || 0) + grossAmount,
                  totalCommissionEarned:
                    Number(tenant?.totalCommissionEarned || 0) + platformFee,
                  escrowLastUpdated: new Date(),
                },
              });
              this.logger.log(
                `    💰 Tenant escrow balance updated: +${tenantNetAmount} XAF (new balance: ${newBalance} XAF)`,
              );

              // Mark payment as credited to escrow
              await this.prisma.payment.update({
                where: { id: payment.id },
                data: {
                  escrowCredited: true,
                  grossAmount: grossAmount,
                },
              });
            } catch (billingError: any) {
              this.logger.error(
                `    ❌ Billing transaction creation failed: ${billingError.message}`,
              );
              // Continue with user activation even if billing transaction fails
            }
          } else {
            this.logger.log(
              `  💳 DIRECT MODE: Money went directly to tenant's Fapshi account`,
            );
          }

          // Proceed with user activation
          this.logger.log(
            `  ✅ Payment SUCCESSFUL - activating user access (Tenant: ${payment.tenantId})`,
          );
          const activationResult = await this.activateUserAccess(payment);

          // Log billing event for tenant tracking
          // TODO: Add billingLog table to schema
          /*
          try {
            await this.prisma.billingLog.create({
              data: {
                tenantId: payment.tenantId,
                userId: payment.userId,
                planId: payment.planId,
                amount: payment.amount,
                transactionId: data.transId,
                status: 'SUCCESSFUL',
                eventType: 'PAYMENT_COMPLETED',
                timestamp: new Date(),
              },
            }).catch(() => {
              // Table might not exist in current schema, continue anyway
              this.logger.warn(`⚠️ BillingLog table not available, skipping billing event`);
            });
          } catch (error) {
            this.logger.error(`❌ Error recording billing event: ${error.message}`);
          }
          */

          return {
            success: true,
            status: statusResponse.data.status,
            activation: activationResult,
            tenantId: payment.tenantId,
            paymentModel: payment.paymentModel,
            message:
              activationResult?.message ||
              'Payment completed and user activated',
          };
        case 'FAILED':
          this.logger.warn(
            `  ❌ Payment FAILED: ${data.transId} (Tenant: ${payment.tenantId})`,
          );

          // Provide more specific failure reasons based on Fapshi response
          let failureMessage = 'Payment was declined';
          if (statusResponse.data.message) {
            const fapshiMsg = statusResponse.data.message.toLowerCase();
            if (
              fapshiMsg.includes('insufficient') ||
              fapshiMsg.includes('balance')
            ) {
              failureMessage = 'Payment failed: Insufficient account balance';
            } else if (
              fapshiMsg.includes('cancelled') ||
              fapshiMsg.includes('declined')
            ) {
              failureMessage = 'Payment was cancelled or declined';
            } else if (
              fapshiMsg.includes('timeout') ||
              fapshiMsg.includes('expired')
            ) {
              failureMessage = 'Payment timed out or expired';
            } else if (fapshiMsg.includes('invalid')) {
              failureMessage = 'Payment failed: Invalid transaction details';
            } else {
              // Use Fapshi's message if it's concise and user-friendly
              failureMessage =
                statusResponse.data.message.length < 100
                  ? `Payment failed: ${statusResponse.data.message}`
                  : failureMessage;
            }
          }

          // Log failed billing event
          // TODO: Add billingLog table to schema
          /*
          try {
            await this.prisma.billingLog.create({
              data: {
                tenantId: payment.tenantId,
                userId: payment.userId,
                planId: payment.planId,
                amount: payment.amount,
                transactionId: data.transId,
                status: 'FAILED',
                eventType: 'PAYMENT_FAILED',
                timestamp: new Date(),
                metadata: { failureReason: failureMessage },
              },
            }).catch(() => {
              this.logger.warn(`⚠️ BillingLog table not available`);
            });
          } catch (error) {
            this.logger.error(`❌ Error recording failed billing event: ${error.message}`);
          }
          */

          if (
            payment.paymentPurpose === 'TENANT_RENTAL' &&
            payment.tenantSubscriptionId
          ) {
            await this.prisma.tenantSubscription.updateMany({
              where: {
                id: payment.tenantSubscriptionId,
                status: 'PENDING',
              },
              data: {
                status: 'FAILED',
              },
            });
          }

          return {
            success: false,
            status: 'FAILED',
            tenantId: payment.tenantId,
            message: failureMessage,
          };
        case 'EXPIRED':
          if (
            payment.paymentPurpose === 'TENANT_RENTAL' &&
            payment.tenantSubscriptionId
          ) {
            await this.prisma.tenantSubscription.updateMany({
              where: {
                id: payment.tenantSubscriptionId,
                status: 'PENDING',
              },
              data: {
                status: 'FAILED',
              },
            });
          }
          this.logger.warn(
            `  ⏱️ Payment EXPIRED: ${data.transId} (Tenant: ${payment.tenantId})`,
          );

          // Log expired billing event
          // TODO: Add billingLog table to schema
          /*
          try {
            await this.prisma.billingLog.create({
              data: {
                tenantId: payment.tenantId,
                userId: payment.userId,
                planId: payment.planId,
                amount: payment.amount,
                transactionId: data.transId,
                status: 'EXPIRED',
                eventType: 'PAYMENT_EXPIRED',
                timestamp: new Date(),
              },
            }).catch(() => {
              this.logger.warn(`⚠️ BillingLog table not available`);
            });
          } catch (error) {
            this.logger.error(`❌ Error recording expired billing event: ${error.message}`);
          }
          */

          return {
            success: false,
            status: 'EXPIRED',
            tenantId: payment.tenantId,
            message: 'Payment request has expired',
          };
        default:
          this.logger.warn(
            `  ⚠️ Unknown payment status: ${statusResponse.data.status} (Tenant: ${payment.tenantId})`,
          );
          return {
            success: false,
            status: statusResponse.data.status,
            tenantId: payment.tenantId,
            message: 'Unknown payment status',
          };
      }
    } catch (error: any) {
      this.logger.error(`❌ Webhook notification error: ${error.message}`);

      // Convert webhook errors to user-friendly messages
      let errorMessage =
        'Payment processing failed. Please contact support if the issue persists.';

      if (error.response) {
        const fapshiError = error.response.data;
        this.logger.error(`❌ Fapshi webhook error response:`, fapshiError);

        if (fapshiError.message) {
          const errorMsg = fapshiError.message.toLowerCase();

          if (
            errorMsg.includes('not found') ||
            errorMsg.includes('transaction')
          ) {
            errorMessage =
              'Payment transaction not found. Please try initiating a new payment.';
          } else if (
            errorMsg.includes('timeout') ||
            errorMsg.includes('network')
          ) {
            errorMessage =
              'Payment service temporarily unavailable. Your payment may still be processing.';
          } else {
            errorMessage =
              fapshiError.message.length < 100
                ? fapshiError.message
                : errorMessage;
          }
        }
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        errorMessage =
          'Payment service is currently unavailable. Please try again later.';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage =
          'Payment processing timed out. Please check your payment status manually.';
      }

      return {
        success: false,
        error: errorMessage,
        technical: error.message, // Keep technical details for logging
      };
    }
  }

  private async activateUserAccess(payment: PrismaPayment) {
    this.logger.log(`🚀 Activating user access for payment: ${payment.id}`);
    this.logger.log(
      `   📋 Payment details: planId=${payment.planId}, userId=${payment.userId}, status=${payment.status}`,
    );
    this.logger.log(
      `   📌 Device info: macAddress=${payment.macAddress}, routerIdentity=${payment.routerIdentity}`,
    );
    this.logger.log(
      `   🔐 Silent login info: userIp=${payment.userIp}, hasPassword=${!!payment.password}`,
    );

    try {
      if (!payment.planId) throw new Error('Payment has no plan ID');
      this.logger.log(`  1️⃣ Fetching plan details (ID: ${payment.planId})`);
      const plan = await this.plansService.findById(
        payment.tenantId,
        payment.planId,
      );
      if (!plan) throw new Error('Plan not found');
      this.logger.log(
        `  ✅ Plan found: ${plan.name} (${plan.duration}h duration)`,
      );

      const isGift = payment.isGift || false;
      let username: string;
      let targetUserId: string;
      let needsReactivation = false;
      let giftPassword = payment.password;

      if (isGift && payment.recipientUsername) {
        // Gift flow: activate recipient's username
        username = payment.recipientUsername;
        this.logger.log(`  🎁 GIFT FLOW: Activating for recipient: ${username}`);

        // Check if recipient exists
        this.logger.log(`  2️⃣ Checking if recipient exists: ${username}`);
        let recipient = await this.usersService.findByUsername(payment.tenantId, username);

        if (!recipient) {
          // Create new recipient user
          this.logger.log(`  ➕ Recipient doesn't exist, creating new user: ${username}`);

          // Generate a secure temporary password for gift recipients if none provided
          if (!giftPassword) {
            giftPassword = randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
            this.logger.log(`  🔐 Generated temporary password for gift recipient: ****** (12 chars)`);
          }

          recipient = await this.usersService.create(
            payment.tenantId,
            username,
            giftPassword,
            undefined, // macAddress - not known for gifts
            undefined, // ipAddress - not known for gifts
            undefined, // routerIdentity - not known for gifts
          );
          this.logger.log(`  ✅ New recipient user created: ${recipient.id}`);
          needsReactivation = false; // New user, not reactivation
        } else {
          this.logger.log(`  ✅ Recipient found: ${recipient.username} (${recipient.isActive ? 'Active' : 'Inactive'})`);
          needsReactivation = !recipient.isActive;
          if (payment.password) {
            giftPassword = payment.password;
            const hashedPassword = await bcrypt.hash(payment.password, 10);
            await this.usersService.updateUser(payment.tenantId, recipient.id, {
              password: hashedPassword,
            });
            this.logger.log(`  🔐 Updated existing recipient password for gift user: ${username}`);
          } else if (!giftPassword) {
            giftPassword = randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
            const hashedPassword = await bcrypt.hash(giftPassword, 10);
            await this.usersService.updateUser(payment.tenantId, recipient.id, {
              password: hashedPassword,
            });
            this.logger.log(`  🔐 Generated and updated temporary password for existing gift recipient: ****** (12 chars)`);
          }
          if (needsReactivation) {
            this.logger.log(`  🔄 Recipient needs reactivation`);
          }
        }

        targetUserId = recipient.id; // Use recipient's ID for database updates
      } else {
        // Self-purchase flow: activate payer's username
        if (!payment.userId) throw new Error('Payment has no user ID');
        this.logger.log(`  2️⃣ Fetching user details (ID: ${payment.userId})`);
        const user = await this.usersService.findById(
          payment.tenantId,
          payment.userId,
        );
        if (!user) throw new Error('User not found');
        this.logger.log(`  ✅ User found: ${user.username}`);
        username = user.username;
        targetUserId = payment.userId;

        // Check if user is deactivated and needs reactivation
        needsReactivation = !user.isActive;
      }

      this.logger.log(
        `  3️⃣ Calculating session expiry (${plan.duration} hours from now)`,
      );
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + plan.duration);
      this.logger.log(`  ✅ Session will expire on: ${expiry.toISOString()}`);

      // Update user record in MongoDB (recipient for gifts, payer for self-purchase)
      this.logger.log(`  4️⃣ Checking user activation status in MongoDB`);

      if (needsReactivation) {
        this.logger.log(
          `  🔄 USER NEEDS REACTIVATION: ${username} was deactivated, reactivating...`,
        );
      } else {
        this.logger.log(
          `  📝 User activation status: ${isGift ? 'New recipient or extending recipient session' : 'New user or extending active session'}`,
        );
      }

      const userUpdateData: any = {
        isActive: true,
        sessionExpiry: expiry,
      };

      // For gifts, we don't have device info since recipient logs in manually
      // For self-purchase, include device info for silent login
      if (!isGift) {
        if (payment.macAddress) {
          userUpdateData.macAddress = payment.macAddress;
          this.logger.log(
            `  📌 MAC address found in payment: ${payment.macAddress}`,
          );
        }

        if (payment.userIp) {
          userUpdateData.ipAddress = payment.userIp;
          this.logger.log(
            `  🌐 IP address found in payment: ${payment.userIp}`,
          );
        }

        if (payment.routerIdentity) {
          userUpdateData.routerIdentity = payment.routerIdentity;
          this.logger.log(
            `  🛰️ Router identity found: ${payment.routerIdentity}`,
          );
        }
      }

      await this.usersService.updateUser(
        payment.tenantId,
        targetUserId,
        userUpdateData,
      );
      this.logger.log(
        `  ✅ ${isGift ? 'Recipient' : 'User'} ${needsReactivation ? 'reactivated' : 'activated'} in MongoDB${isGift ? '' : ' with device info'}`,
      );

      // Generate voucher for RADIUS authentication
      this.logger.log(`  🎟️  6️⃣ Generating RADIUS voucher`);
      const user = await this.usersService.findById(payment.tenantId, targetUserId);

      // Determine plaintext password to use for voucher: prefer provided gift password, otherwise reuse generated gift password
      let voucherPlaintext = payment.password || giftPassword;
      if (!voucherPlaintext && isGift) {
        voucherPlaintext = randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
        this.logger.log(`  🔐 Generated temporary voucher password for gift: ****** (12 chars)`);
      }

      if (user && voucherPlaintext) {
        const voucherCode = await this.voucherService.generateVoucher(
          payment.tenantId,
          targetUserId,
          user,
          voucherPlaintext,
          plan.duration,
        );
        this.logger.log(`  ✅ Voucher generated: ${user.username}:****`);
      } else {
        this.logger.warn(`  ⚠️ Could not generate voucher - missing user or password data`);
      }

      // Activate on MikroTik - FIRST: Check if user exists, create if not, then activate
      this.logger.log(`  5️⃣ Checking MikroTik user account for: ${username}`);

      // Check if user exists on MikroTik
      this.logger.log(
        `  🔍 Checking if user ${username} exists on MikroTik...`,
      );
      const userExistsOnMikrotik = this.routerProvider?.userExists
        ? await this.routerProvider.userExists(username)
        : await this.mikrotikService.userExists(username);

      if (!userExistsOnMikrotik) {
        this.logger.log(
          `  ➕ User ${username} does not exist on MikroTik - creating user account first...`,
        );
        try {
          // Create the user account on MikroTik first
          if (this.routerProvider?.createUser) {
            await this.routerProvider.createUser(username, giftPassword || username);
          } else {
            await this.mikrotikService.createUser(
              username,
              giftPassword || username,
            );
          }
          this.logger.log(
            `  ✅ User ${username} created successfully on MikroTik`,
          );
        } catch (createError: any) {
          this.logger.error(
            `  ❌ Failed to create user ${username} on MikroTik: ${createError.message}`,
          );
          throw new Error(
            `Failed to create user account on MikroTik: ${createError.message}`,
          );
        }
      } else {
        this.logger.log(`  ✅ User ${username} already exists on MikroTik`);
      }

      // Now activate/create hotspot user (this will handle the duration and router assignment)
      this.logger.log(
        `  6️⃣ ${needsReactivation ? 'Reactivating' : 'Creating'} hotspot user on MikroTik router`,
      );
      try {
        this.logger.log(
          `  📌 ${needsReactivation ? 'Reactivating' : 'Creating'} hotspot user account: ${username}`,
        );
        const createUserResult = this.routerProvider?.createHotspotUserOnly
          ? await this.routerProvider.createHotspotUserOnly(username, plan.duration)
          : await this.mikrotikService.createHotspotUserOnly(
              username,
              plan.duration,
            );
        this.logger.log(
          `  ✅ Hotspot user ${needsReactivation ? 'reactivated' : 'created'} on router: ${createUserResult.activeRouter}`,
        );
        (payment as any).activeRouter = createUserResult.activeRouter;

        // Check if we can attempt silent login after device connects
        this.logger.log(`  7️⃣ CHECKING SILENT LOGIN CAPABILITIES:`);
        this.logger.log(`     - isGift: ${isGift}`);
        this.logger.log(`     - payment.macAddress: ${payment.macAddress}`);
        this.logger.log(`     - payment.userIp: ${payment.userIp}`);
        this.logger.log(
          `     - payment.password: ${payment.password ? '(present)' : '(MISSING)'}`,
        );

        const canAttemptSilentLogin =
          !isGift && payment.macAddress && payment.userIp && payment.password;
        if (canAttemptSilentLogin) {
          this.logger.log(
            `     → ✅ SILENT LOGIN AVAILABLE - Will attempt after device connects to WiFi`,
          );
          this.logger.log(
            `     📌 Device must connect to WiFi first to appear in /ip/hotspot/host`,
          );
        } else {
          this.logger.log(
            `     → ℹ️ STANDARD LOGIN ONLY - Device will authenticate via portal`,
          );
        }
      } catch (activateError: any) {
        this.logger.error(
          `  ❌ MikroTik user creation failed: ${activateError.message}`,
        );

        // Convert MikroTik errors to user-friendly messages
        let userFriendlyMessage =
          'Internet access setup failed. Please contact support.';

        if (activateError.message) {
          const errorMsg = activateError.message.toLowerCase();

          if (errorMsg.includes('connection') || errorMsg.includes('connect')) {
            userFriendlyMessage =
              'Unable to connect to internet router. Please try again in a few minutes.';
          } else if (
            errorMsg.includes('timeout') ||
            errorMsg.includes('network')
          ) {
            userFriendlyMessage =
              'Router connection timed out. Your payment was successful - please try logging in manually.';
          } else if (
            errorMsg.includes('unreachable') ||
            errorMsg.includes('refused')
          ) {
            userFriendlyMessage =
              'Internet service temporarily unavailable. Your payment was successful - access will be available shortly.';
          } else if (
            errorMsg.includes('all routers failed') ||
            errorMsg.includes('available router')
          ) {
            userFriendlyMessage =
              'All internet routers are currently offline. Your payment was successful - please try again later.';
          } else {
            // Use the original message if it's concise and technical details are stripped
            userFriendlyMessage =
              activateError.message.length < 150
                ? `Internet setup failed: ${activateError.message}`
                : userFriendlyMessage;
          }
        }

        // Create a new error with user-friendly message but keep technical details for logging
        const userError = new Error(userFriendlyMessage);
        userError.name = 'MikroTikActivationError';
        throw userError;
      }

      // Save activeRouter field for audit trail
      if ((payment as any).activeRouter) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            activeRouter: (payment as any).activeRouter,
          },
        });
      }

      // Log activity for successful payment
      const plan_ref = payment.planId
        ? await this.plansService.findById(payment.tenantId, payment.planId)
        : null;
      await this.activitiesService.logActivity(
        payment.tenantId,
        payment.userId || 'unknown',
        'payment_processed',
        'payment',
        `${isGift ? `Gift: ` : ''}${needsReactivation ? 'Reactivation: ' : ''}Payment of ${payment.amount} CFA processed successfully for ${plan_ref?.name || 'Plan'} (${plan_ref?.duration}h)`,
        'success',
        {
          planName: plan_ref?.name,
          planId: payment.planId,
          amount: payment.amount,
          duration: plan_ref?.duration,
          transactionId: payment.fapshiTransactionId,
          isGift,
          recipientUsername: payment.recipientUsername || undefined,
          wasReactivation: needsReactivation,
        },
        undefined,
        {
          routerIdentity: payment.activeRouter || undefined,
          sessionId: undefined,
        },
      );

      this.logger.log(
        `✅ ${isGift ? 'Gift recipient' : 'User'} ${needsReactivation ? 'reactivation' : 'activation'} complete: ${username}`,
      );

      // Return activation data for silent login on frontend (only for self-purchase)
      const activationResult = {
        success: true,
        username: username,
        sessionExpiry: expiry.toISOString(),
        readyForSilentLogin: !isGift, // Silent login only available for self-purchase
        message: isGift
          ? `Gift activated for ${username} - recipient can now log in manually`
          : `User ${needsReactivation ? 'reactivated' : 'activated'} - ready for silent login`,
        wasReactivation: needsReactivation,
        isGift: isGift,
      };

      this.logger.log(
        `   📦 Returning activation result: ${JSON.stringify(activationResult)}`,
      );
      return activationResult;
    } catch (error: any) {
      this.logger.error(`❌ Error activating user access: ${error.message}`);

      // Log failed payment
      const plan_ref = payment.planId
        ? await this.plansService.findById(payment.tenantId, payment.planId)
        : null;
      await this.activitiesService.logActivity(
        payment.tenantId,
        payment.userId || 'unknown',
        'payment_failed',
        'payment',
        `Payment of ${payment.amount} CFA activation failed for ${plan_ref?.name || 'Plan'}: ${error.message}`,
        'failed',
        {
          planName: plan_ref?.name,
          amount: payment.amount,
          transactionId: payment.fapshiTransactionId,
          error: error.message,
        },
      );

      // Return error result instead of throwing
      return {
        success: false,
        error: error.message,
        readyForSilentLogin: false,
        message: `Activation failed: ${error.message}`,
      };
    }
  }

  async reconnectUserIfNeeded(
    tenantId: string,
    userId: string,
  ): Promise<{
    reconnected: boolean;
    username?: string;
    remainingTime?: number;
    remainingHours?: number;
    reason?: string;
  }> {
    this.logger.log(`🔄 Checking if user needs WiFi reconnection: ${userId}`);
    try {
      this.logger.log(`  1️⃣ Fetching user details (ID: ${userId})`);
      const user = await this.usersService.findById(tenantId, userId);
      if (!user) {
        this.logger.warn(`  ⚠️ User not found: ${userId}`);
        return { reconnected: false, reason: 'User not found' };
      }
      this.logger.log(`  ✅ User found: ${user.username}`);

      // Check if user has an active session
      const isSessionActive = !!(
        user.isActive &&
        user.sessionExpiry &&
        new Date() < user.sessionExpiry
      );

      if (!isSessionActive) {
        this.logger.log(`  ℹ️ User has no active session`);
        return { reconnected: false, reason: 'No active session' };
      }

      this.logger.log(
        `  2️⃣ User has active session - calculating remaining time`,
      );
      const now = new Date();
      const remainingMs = user.sessionExpiry!.getTime() - now.getTime();
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
      this.logger.log(`  ✅ Remaining session time: ${remainingHours} hours`);

      // Reactivate on MikroTik - move user from Hosts to Active
      this.logger.log(
        `  3️⃣ Reactivating user on MikroTik router (Hosts → Active)`,
      );
      try {
        // For returning users with MAC & IP: Attempt silent login to move from Hosts to Active
        // Otherwise: Just ensure hotspot user exists
        if (user.macAddress && user.ipAddress) {
          this.logger.log(
            `  📌 Attempting silent login - moving user from Hosts to Active`,
          );
          this.logger.log(
            `     MAC: ${user.macAddress}, IP: ${user.ipAddress}`,
          );

          try {
            // Try to perform silent login to move user from Hosts to Active
            const silentLoginResult = this.routerProvider?.silentLogin
              ? await this.routerProvider.silentLogin(
                  user.username,
                  user.password || '',
                  user.macAddress,
                  user.ipAddress,
                  remainingHours,
                )
              : await this.mikrotikService.silentLogin(
                  user.username,
                  user.password || '', // Use password if available
                  user.macAddress,
                  user.ipAddress,
                  remainingHours,
                );
            this.logger.log(
              `  ✅ Silent login successful - user moved to Active tab on router: ${silentLoginResult.activeRouter}`,
            );
            return {
              reconnected: true,
              username: user.username,
              remainingTime: remainingMs,
              remainingHours: remainingHours,
            };
          } catch (silentLoginError: any) {
            // Silent login failed - fallback to just ensuring user exists in hotspot
            this.logger.log(
              `  ⚠️ Silent login failed: ${silentLoginError.message}`,
            );
            this.logger.log(
              `  📌 Falling back to basic hotspot user verification`,
            );
            const createUserResult = this.routerProvider?.createHotspotUserOnly
              ? await this.routerProvider.createHotspotUserOnly(user.username, remainingHours)
              : await this.mikrotikService.createHotspotUserOnly(
                  user.username,
                  remainingHours,
                );
            this.logger.log(
              `  ✅ User verified on hotspot Hosts tab on router: ${createUserResult.activeRouter}`,
            );
            this.logger.log(
              `  ℹ️ User is ready for normal login or silent login once device connects`,
            );
          }
        } else {
          this.logger.log(
            `  📌 Basic reconnection - ensuring hotspot user exists: ${user.username}`,
          );
          const createUserResult = this.routerProvider?.createHotspotUserOnly
            ? await this.routerProvider.createHotspotUserOnly(user.username, remainingHours)
            : await this.mikrotikService.createHotspotUserOnly(
                user.username,
                remainingHours,
              );
          this.logger.log(
            `  ✅ Hotspot user verified on router: ${createUserResult.activeRouter}`,
          );
          this.logger.log(`  ℹ️ User account exists on MikroTik (Hosts tab)`);
        }

        return {
          reconnected: true,
          username: user.username,
          remainingTime: remainingMs,
          remainingHours: remainingHours,
        };
      } catch (error: any) {
        this.logger.error(`❌ Error reconnecting user: ${error.message}`);
        // Log error but don't throw - user can still proceed even if reconnection fails
        return {
          reconnected: false,
          reason: `Connection error: ${error.message}`,
        };
      }
    } catch (error: any) {
      this.logger.error(
        `❌ Unexpected error in reconnectUserIfNeeded: ${error.message}`,
      );
      return {
        reconnected: false,
        reason: `Unexpected error: ${error.message}`,
      };
    }
  }

  async getUserPayments(userId: string) {
    this.logger.log(`📋 Fetching payment history for user: ${userId}`);
    try {
      const payments = await this.prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      this.logger.log(
        `✅ Retrieved ${payments.length} payments for user: ${userId}`,
      );
      return payments;
    } catch (error: any) {
      this.logger.error(
        `❌ Error fetching payment history for user ${userId}: ${error.message}`,
      );
      throw error;
    }
  }
}
