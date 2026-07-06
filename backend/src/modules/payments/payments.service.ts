import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RazorpayService } from './razorpay.service';
import { StripeService } from './stripe.service';
import { PaymentStatus, PaymentMethod } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private razorpay: RazorpayService,
    private stripe: StripeService,
  ) {}

  /**
   * Verifies the caller owns the order (admins bypass). Prevents users from
   * initiating/verifying payments or reading payment data for others' orders.
   */
  private async assertOrderAccess(orderId: string, userId?: string, isAdmin = false) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (!isAdmin && userId && order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }
    return order;
  }

  async initiatePayment(
    orderId: string,
    method: PaymentMethod,
    idempotencyKey?: string,
    userId?: string,
  ) {
    // Check idempotency
    if (idempotencyKey) {
      const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
      if (existing) return existing;
    }

    const order = await this.assertOrderAccess(orderId, userId);

    let gatewayResponse: any;

    switch (method) {
      case PaymentMethod.RAZORPAY:
        gatewayResponse = await this.razorpay.createOrder(order.total, order.orderNumber);
        break;
      case PaymentMethod.STRIPE:
        gatewayResponse = await this.stripe.createPaymentIntent(order.total, 'inr', order.orderNumber);
        break;
      case PaymentMethod.COD:
        gatewayResponse = { status: 'confirmed', message: 'Cash on delivery' };
        break;
      default:
        throw new BadRequestException(`Unsupported payment method: ${method}`);
    }

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        amount: order.total,
        currency: 'INR',
        status: method === PaymentMethod.COD ? PaymentStatus.CAPTURED : PaymentStatus.INITIATED,
        method,
        gatewayOrderId: gatewayResponse.id || gatewayResponse.orderId,
        gatewayResponse,
        idempotencyKey,
        attempts: 1,
      },
    });

    // For COD, confirm order immediately
    if (method === PaymentMethod.COD) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'PAYMENT_CONFIRMED', paymentId: payment.id },
      });
    }

    return {
      paymentId: payment.id,
      gatewayOrderId: gatewayResponse.id || gatewayResponse.orderId,
      gatewayData: gatewayResponse,
    };
  }

  async verifyPayment(paymentId: string, verificationData: any, userId?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) throw new BadRequestException('Payment not found');
    if (userId && payment.order?.userId !== userId) {
      throw new ForbiddenException('You do not have access to this payment');
    }

    let isValid = false;

    switch (payment.method) {
      case PaymentMethod.RAZORPAY:
        isValid = this.razorpay.verifyPayment(
          verificationData.razorpay_order_id,
          verificationData.razorpay_payment_id,
          verificationData.razorpay_signature,
        );
        break;
      case PaymentMethod.STRIPE:
        isValid = await this.stripe.verifyPaymentIntent(verificationData.paymentIntentId);
        break;
      default:
        isValid = true;
    }

    if (!isValid) {
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.FAILED, failureReason: 'Verification failed' },
      });
      throw new BadRequestException('Payment verification failed');
    }

    // Update payment
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.CAPTURED,
        gatewayPaymentId: verificationData.razorpay_payment_id || verificationData.paymentIntentId,
        gatewaySignature: verificationData.razorpay_signature,
        paidAt: new Date(),
      },
    });

    // Update order status
    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { status: 'PAYMENT_CONFIRMED', paymentId: payment.id },
    });

    // Add status history
    await this.prisma.orderStatusHistory.create({
      data: {
        orderId: payment.orderId,
        status: 'PAYMENT_CONFIRMED',
        note: `Payment confirmed via ${payment.method}`,
      },
    });

    return { status: 'success', message: 'Payment verified successfully' };
  }

  async handleWebhook(provider: string, payload: any, signature: string) {
    switch (provider) {
      case 'razorpay':
        return this.handleRazorpayWebhook(payload, signature);
      case 'stripe':
        return this.handleStripeWebhook(payload, signature);
      default:
        throw new BadRequestException('Unknown provider');
    }
  }

  async initiateRefund(orderId: string, amount?: number, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: { where: { status: PaymentStatus.CAPTURED } } },
    });

    if (!order || order.payments.length === 0) {
      throw new BadRequestException('No captured payment found for this order');
    }

    const payment = order.payments[0];
    const refundAmount = amount || payment.amount;

    let gatewayRefundId: string | undefined;

    switch (payment.method) {
      case PaymentMethod.RAZORPAY:
        const rzpRefund = await this.razorpay.initiateRefund(
          payment.gatewayPaymentId!,
          refundAmount,
        );
        gatewayRefundId = rzpRefund.id;
        break;
      case PaymentMethod.STRIPE:
        const stripeRefund = await this.stripe.initiateRefund(
          payment.gatewayPaymentId!,
          refundAmount,
        );
        gatewayRefundId = stripeRefund.id;
        break;
    }

    // Create refund record
    const refund = await this.prisma.refund.create({
      data: {
        orderId,
        paymentId: payment.id,
        amount: refundAmount,
        reason: reason || 'Customer requested refund',
        status: 'processing',
        gatewayRefundId,
      },
    });

    // Update payment status
    const newStatus = refundAmount >= payment.amount
      ? PaymentStatus.REFUNDED
      : PaymentStatus.PARTIALLY_REFUNDED;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: newStatus },
    });

    return refund;
  }

  async getPaymentHistory(orderId: string, userId?: string, isAdmin = false) {
    await this.assertOrderAccess(orderId, userId, isAdmin);
    return this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async handleRazorpayWebhook(payload: any, signature: string) {
    const isValid = this.razorpay.verifyWebhookSignature(JSON.stringify(payload), signature);
    if (!isValid) throw new BadRequestException('Invalid webhook signature');

    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;

    if (event === 'payment.captured' && paymentEntity) {
      await this.prisma.payment.updateMany({
        where: { gatewayOrderId: paymentEntity.order_id },
        data: {
          status: PaymentStatus.CAPTURED,
          gatewayPaymentId: paymentEntity.id,
          paidAt: new Date(),
        },
      });
    }

    return { received: true };
  }

  private async handleStripeWebhook(payload: any, signature: string) {
    const event = this.stripe.constructWebhookEvent(payload, signature);

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      await this.prisma.payment.updateMany({
        where: { gatewayOrderId: paymentIntent.id },
        data: {
          status: PaymentStatus.CAPTURED,
          gatewayPaymentId: paymentIntent.id,
          paidAt: new Date(),
        },
      });
    }

    return { received: true };
  }
}
