import { IsString, IsNotEmpty, IsOptional, IsNumber, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InitiatePaymentDto {
  @ApiProperty({ example: 'order-uuid-123', description: 'Order ID to pay for' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ example: 'RAZORPAY', description: 'Payment method (RAZORPAY, STRIPE, COD)' })
  @IsString()
  @IsNotEmpty()
  method: string;
}

export class VerifyPaymentDto {
  @ApiProperty({ example: 'payment-uuid-123', description: 'Payment record ID' })
  @IsString()
  @IsNotEmpty()
  paymentId: string;

  @ApiProperty({ description: 'Gateway-specific verification data (e.g. razorpay_payment_id, razorpay_signature)' })
  @IsObject()
  @IsNotEmpty()
  verificationData: Record<string, any>;
}

export class RefundPaymentDto {
  @ApiProperty({ example: 'order-uuid-123', description: 'Order ID to refund' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiPropertyOptional({ example: 500, description: 'Partial refund amount (omit for full refund)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @ApiPropertyOptional({ example: 'Customer requested cancellation', description: 'Reason for refund' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CancelOrderBodyDto {
  @ApiProperty({ example: 'Changed my mind', description: 'Reason for cancellation' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
