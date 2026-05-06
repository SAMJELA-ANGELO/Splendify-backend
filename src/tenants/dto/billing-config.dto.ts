import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsPhoneNumber,
  Min,
} from 'class-validator';
import { PaymentModel } from '@prisma/client';

export class BillingConfigDto {
  @ApiProperty({
    enum: PaymentModel,
    description:
      'Payment model: DIRECT (ISP uses own Fapshi keys) or ESCROW (funds go to XenFi)',
    example: 'ESCROW',
  })
  @IsEnum(PaymentModel)
  paymentModel: PaymentModel;

  @ApiProperty({
    description: 'Fapshi API key (only used if paymentModel is DIRECT)',
    example: 'FAK_a6ff874d37ee34b95b01b72bd5c49292',
    required: false,
  })
  @IsOptional()
  @IsString()
  fapshiApiKey?: string;

  @ApiProperty({
    description: 'Fapshi Service ID (only used if paymentModel is DIRECT)',
    example: 'SERVICE_12345',
    required: false,
  })
  @IsOptional()
  @IsString()
  fapshiServiceId?: string;

  @ApiProperty({
    description: 'Mobile money phone number for payouts in ESCROW mode',
    example: '+237812345678',
    required: false,
  })
  @IsOptional()
  //@IsPhoneNumber() // Optional: validate phone format
  @IsString()
  payoutMobileMoney?: string;

  @ApiProperty({
    description: 'Minimum escrow balance before payout is allowed (in XAF)',
    example: 10000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  payoutMinimumThreshold?: number;
}

export class BillingConfigResponseDto {
  @ApiProperty({ example: 'tenant-123' })
  tenantId: string;

  @ApiProperty({ enum: PaymentModel })
  paymentModel: PaymentModel;

  @ApiProperty({ example: true })
  hasFapshiKeys: boolean;

  @ApiProperty({ example: '+237812345678', required: false, nullable: true })
  payoutMobileMoney?: string | null;

  @ApiProperty({ example: 10000 })
  payoutMinimumThreshold: number;

  @ApiProperty({ example: 25500.5 })
  escrowBalance: number;

  @ApiProperty({ example: 1275.5 })
  totalCommissionEarned: number;

  @ApiProperty({ example: 24225 })
  totalPayoutsProcessed: number;
}

export class EscrowBalanceDto {
  @ApiProperty({ example: 'tenant-123' })
  tenantId: string;

  @ApiProperty({ example: 25500.5 })
  balance: number;

  @ApiProperty({ example: 1275.5 })
  availableForPayout: number;

  @ApiProperty({ example: 10000 })
  payoutMinimumThreshold: number;

  @ApiProperty({ example: true })
  canRequestPayout: boolean;

  @ApiProperty({ example: '+237812345678', required: false, nullable: true })
  payoutMobileMoney?: string | null;

  @ApiProperty({ example: '2026-04-18T15:30:00Z' })
  lastUpdated: Date;
}

export class RequestPayoutDto {
  @ApiProperty({
    description: 'Amount to request for payout (in XAF)',
    example: 15000,
  })
  @IsNumber()
  @Min(1000)
  amount: number;

  @ApiProperty({
    description: 'Mobile money phone number (can override tenant settings)',
    example: '+237812345678',
    required: false,
  })
  @IsOptional()
  @IsString()
  mobileMoney?: string;
}

export class PayoutResponseDto {
  @ApiProperty({ example: 'payout-123' })
  id: string;

  @ApiProperty({ example: 'tenant-123' })
  tenantId: string;

  @ApiProperty({ example: 15000 })
  amount: number;

  @ApiProperty({ example: 'PENDING' })
  status: string;

  @ApiProperty({ example: '+237812345678' })
  mobileMoney: string;

  @ApiProperty({ example: '2026-04-18T15:30:00Z' })
  requestedAt: Date;

  @ApiProperty({ example: '2026-04-18T16:00:00Z', required: false })
  processedAt?: Date;

  @ApiProperty({ example: '2026-04-18T16:15:00Z', required: false })
  completedAt?: Date;
}

export class PayoutListResponseDto {
  @ApiProperty({
    description: 'Total number of payout records for the tenant',
    example: 12,
  })
  total: number;

  @ApiProperty({
    description: 'List of payout requests for the tenant',
    type: [PayoutResponseDto],
  })
  payouts: PayoutResponseDto[];
}

export class ProcessPayoutDto {
  @ApiProperty({
    description: 'Action to perform: complete or fail',
    enum: ['complete', 'fail'],
    example: 'complete',
  })
  action: 'complete' | 'fail';

  @ApiProperty({
    description: 'Reason for failure (required if action is fail)',
    example: 'Insufficient funds in payment gateway',
    required: false,
  })
  @IsOptional()
  @IsString()
  failureReason?: string;
}

export class AdminPayoutResponseDto {
  @ApiProperty({ example: 'payout-123' })
  id: string;

  @ApiProperty({ example: 'tenant-123' })
  tenantId: string;

  @ApiProperty({ example: 'Starlink ISP Cameroon' })
  tenantName: string;

  @ApiProperty({ example: 15000 })
  amount: number;

  @ApiProperty({ example: 'COMPLETED' })
  status: string;

  @ApiProperty({ example: '+237812345678' })
  mobileMoney: string;

  @ApiProperty({ example: '2026-04-18T15:30:00Z' })
  requestedAt: Date;

  @ApiProperty({ example: '2026-04-18T16:00:00Z', required: false })
  processedAt?: Date;

  @ApiProperty({ example: '2026-04-18T16:15:00Z', required: false })
  completedAt?: Date;
}

export class AdminPayoutsListDto {
  @ApiProperty({
    description: 'Total number of pending payouts',
    example: 5,
  })
  total: number;

  @ApiProperty({
    description: 'List of pending payout requests',
    type: [AdminPayoutResponseDto],
  })
  payouts: AdminPayoutResponseDto[];
}

export class BalanceTransactionDto {
  @ApiProperty({ example: 'balance-tx-123' })
  id: string;

  @ApiProperty({ example: 'tenant-123' })
  tenantId: string;

  @ApiProperty({ example: 'payment-456', required: false })
  paymentId?: string;

  @ApiProperty({ example: 'payout-789', required: false })
  payoutRequestId?: string;

  @ApiProperty({ example: 25000 })
  amount: number;

  @ApiProperty({ example: 1250 })
  fee: number;

  @ApiProperty({ example: 23750 })
  netAmount: number;

  @ApiProperty({
    example: 'PAYMENT',
    enum: ['PAYMENT', 'PAYOUT_REQUEST', 'PAYOUT_FAILED', 'PAYOUT_COMPLETED'],
  })
  transactionType: string;

  @ApiProperty({
    example: 'ESCROW payment ledger entry for payment payment-456',
  })
  description?: string;

  @ApiProperty({ example: '2026-04-18T15:30:00Z' })
  createdAt: Date;
}

export class LedgerHistoryDto {
  @ApiProperty({
    description: 'Total number of ledger transactions',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Current escrow balance',
    example: 125000.5,
  })
  currentBalance: number;

  @ApiProperty({
    description: 'List of balance transactions',
    type: [BalanceTransactionDto],
  })
  transactions: BalanceTransactionDto[];
}

export class LedgerFiltersDto {
  @ApiProperty({
    description: 'Filter by transaction type',
    enum: ['PAYMENT', 'PAYOUT_REQUEST', 'PAYOUT_FAILED', 'PAYOUT_COMPLETED'],
    required: false,
  })
  @IsOptional()
  @IsString()
  transactionType?: string;

  @ApiProperty({
    description: 'Number of transactions to return',
    example: 20,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiProperty({
    description: 'Number of transactions to skip',
    example: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}
