import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class RazorpayService {
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;

  constructor(private configService: ConfigService) {
    this.keyId = this.configService.get('RAZORPAY_KEY_ID', '');
    this.keySecret = this.configService.get('RAZORPAY_KEY_SECRET', '');
    this.webhookSecret = this.configService.get('RAZORPAY_WEBHOOK_SECRET', '');
  }

  async createOrder(amount: number, receipt: string): Promise<any> {
    // Using Razorpay SDK
    const Razorpay = require('razorpay');
    const instance = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });

    const options = {
      amount: Math.round(amount * 100), // Amount in paise
      currency: 'INR',
      receipt,
      payment_capture: 1,
    };

    return instance.orders.create(options);
  }

  verifyPayment(orderId: string, paymentId: string, signature: string): boolean {
    const generatedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    return generatedSignature === signature;
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  }

  async initiateRefund(paymentId: string, amount: number): Promise<any> {
    const Razorpay = require('razorpay');
    const instance = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });

    return instance.payments.refund(paymentId, {
      amount: Math.round(amount * 100),
      speed: 'normal',
    });
  }

  async fetchPayment(paymentId: string): Promise<any> {
    const Razorpay = require('razorpay');
    const instance = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });

    return instance.payments.fetch(paymentId);
  }
}
