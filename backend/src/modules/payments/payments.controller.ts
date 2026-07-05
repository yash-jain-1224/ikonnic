import { Controller, Post, Body, Param, Headers, UseGuards, Req, Get, RawBodyRequest } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InitiatePaymentDto, VerifyPaymentDto, RefundPaymentDto } from './dto/payment.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate payment for an order' })
  async initiate(
    @Body() body: InitiatePaymentDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentsService.initiatePayment(body.orderId, body.method as any, idempotencyKey);
  }

  @Post('verify')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify payment after gateway callback' })
  async verify(@Body() body: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(body.paymentId, body.verificationData);
  }

  @Post('refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate refund for an order' })
  async refund(@Body() body: RefundPaymentDto) {
    return this.paymentsService.initiateRefund(body.orderId, body.amount, body.reason);
  }

  @Get('history/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment history for an order' })
  async history(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentHistory(orderId);
  }

  @Post('webhook/:provider')
  @SkipThrottle()
  @ApiOperation({ summary: 'Payment gateway webhook handler' })
  async webhook(
    @Param('provider') provider: string,
    @Body() payload: any,
    @Headers('x-razorpay-signature') razorpaySignature?: string,
    @Headers('stripe-signature') stripeSignature?: string,
  ) {
    const signature = razorpaySignature || stripeSignature || '';
    return this.paymentsService.handleWebhook(provider, payload, signature);
  }
}
