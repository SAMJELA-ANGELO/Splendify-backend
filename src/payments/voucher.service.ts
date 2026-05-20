import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

/**
 * VoucherService - Generates and manages RADIUS vouchers for users
 * 
 * Voucher Format: username:password (plaintext)
 * 
 * The voucher uses:
 * - Username: The user's account username
 * - Password: The ORIGINAL plaintext password used when creating the account
 *   (or the password provided during plan purchase)
 * 
 * RADIUS Authentication Flow:
 * 1. User connects to hotspot
 * 2. MikroTik sends RADIUS Access-Request with voucher code as username and plaintext password
 * 3. Server verifies username exists and session hasn't expired
 * 4. Server compares provided password against hashed password in database using bcrypt
 * 5. If valid and not expired, returns Access-Accept with session attributes
 * 
 * Session Timing (Purchase-Based Expiry):
 * - Expiry = Purchase Time + Plan Duration
 * - Example: Purchased at 3pm with 2-hour plan = expires at 5pm
 * - Regardless of connection status, user is disconnected at expiry time
 * - Session cleanup service runs every minute to enforce expiry
 */
@Injectable()
export class VoucherService {
  private readonly logger = new Logger(VoucherService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate a voucher for a user after successful plan purchase
   * 
   * @param tenantId - Tenant ID
   * @param userId - User ID
   * @param user - User object from database
   * @param plaintextPassword - The plaintext password (from payment or account creation)
   * @param planDurationHours - Duration of the plan in hours
   * @returns Voucher code in format: username:password
   */
  async generateVoucher(
    tenantId: string,
    userId: string,
    user: User,
    plaintextPassword: string,
    planDurationHours: number,
  ): Promise<string> {
    this.logger.log(
      `🎟️ Generating voucher for user: ${user.username} (Plan duration: ${planDurationHours}h)`,
    );

    try {
      // Generate voucher in format: username:plaintext_password
      // The plaintext password is required for RADIUS authentication
      // (RADIUS client sends it, server compares it against the hashed password)
      const voucherCode = `${user.username}:${plaintextPassword}`;

      // Calculate session expiry: NOW + plan duration
      const purchaseTime = new Date();
      const expiryTime = new Date(purchaseTime);
      expiryTime.setHours(expiryTime.getHours() + planDurationHours);

      this.logger.log(
        `  📅 Purchase-based expiry calculated:`,
      );
      this.logger.log(
        `     Purchase Time: ${purchaseTime.toISOString()}`,
      );
      this.logger.log(
        `     Expiry Time: ${expiryTime.toISOString()}`,
      );
      this.logger.log(
        `     Duration: ${planDurationHours} hours`,
      );

      // Update user with voucher and plan timing
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          voucherCode: voucherCode,
          planPurchaseTime: purchaseTime,
          planDurationHours: planDurationHours,
          sessionExpiry: expiryTime,
          isActive: true,
        },
      });

      this.logger.log(
        `  ✅ Voucher generated successfully:`,
      );
      this.logger.log(
        `     Voucher Code: [${user.username}:••••••••]`,
      );
      this.logger.log(
        `     Username: ${user.username}`,
      );
      this.logger.log(
        `     Session Expiry: ${expiryTime.toISOString()}`,
      );

      return voucherCode;
    } catch (error: any) {
      this.logger.error(
        `❌ Error generating voucher for user ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get voucher information for a user
   */
  async getVoucherInfo(tenantId: string, userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.voucherCode) {
      return null;
    }

    const now = new Date();
    const isExpired = user.sessionExpiry ? user.sessionExpiry < now : false;
    const timeRemaining = user.sessionExpiry
      ? Math.max(0, user.sessionExpiry.getTime() - now.getTime())
      : null;

    return {
      username: user.username,
      voucherCode: user.voucherCode,
      planPurchaseTime: user.planPurchaseTime,
      planDurationHours: user.planDurationHours,
      sessionExpiry: user.sessionExpiry,
      isExpired,
      timeRemainingMs: timeRemaining,
      timeRemainingMinutes: timeRemaining
        ? Math.floor(timeRemaining / 60000)
        : null,
      timeRemainingHours: timeRemaining
        ? Math.floor(timeRemaining / 3600000)
        : null,
    };
  }

  /**
   * Revoke a voucher (when user is deactivated or plan expires)
   */
  async revokeVoucher(tenantId: string, userId: string): Promise<void> {
    this.logger.log(`🗑️ Revoking voucher for user: ${userId}`);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        voucherCode: null,
        isActive: false,
        sessionExpiry: new Date(), // Set to now to force expiry
      },
    });

    this.logger.log(`  ✅ Voucher revoked`);
  }

  /**
   * Check if a voucher is still valid
   */
  async isVoucherValid(voucherCode: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: {
        voucherCode: voucherCode,
        isActive: true,
      },
    });

    if (!user) {
      return false;
    }

    // Check if session has expired
    if (user.sessionExpiry && user.sessionExpiry < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Get all active vouchers for a tenant (admin view)
   */
  async getTenantVouchers(tenantId: string): Promise<any[]> {
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        voucherCode: { not: null },
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        voucherCode: true,
        planPurchaseTime: true,
        planDurationHours: true,
        sessionExpiry: true,
        planId: true,
      },
    });

    const now = new Date();
    return users.map((user) => ({
      ...user,
      isExpired: user.sessionExpiry ? user.sessionExpiry < now : false,
      timeRemainingMs: user.sessionExpiry
        ? Math.max(0, user.sessionExpiry.getTime() - now.getTime())
        : null,
    }));
  }
}
