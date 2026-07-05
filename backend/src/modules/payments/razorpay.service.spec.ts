import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { RazorpayService } from './razorpay.service';

describe('RazorpayService', () => {
  let service: RazorpayService;

  const KEY_SECRET = 'test_key_secret';
  const WEBHOOK_SECRET = 'test_webhook_secret';

  const configMock = {
    get: jest.fn((key: string, def = '') => {
      const values: Record<string, string> = {
        RAZORPAY_KEY_ID: 'rzp_test_key',
        RAZORPAY_KEY_SECRET: KEY_SECRET,
        RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
      };
      return values[key] ?? def;
    }),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [RazorpayService, { provide: ConfigService, useValue: configMock }],
    }).compile();

    service = moduleRef.get(RazorpayService);
  });

  describe('verifyPayment', () => {
    const orderId = 'order_test123';
    const paymentId = 'pay_test456';

    it('accepts a signature generated with the key secret', () => {
      const validSignature = crypto
        .createHmac('sha256', KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      expect(service.verifyPayment(orderId, paymentId, validSignature)).toBe(true);
    });

    it('rejects a tampered signature', () => {
      expect(service.verifyPayment(orderId, paymentId, 'deadbeef')).toBe(false);
    });

    it('rejects a signature generated for a different payment', () => {
      const otherSignature = crypto
        .createHmac('sha256', KEY_SECRET)
        .update(`${orderId}|pay_other`)
        .digest('hex');

      expect(service.verifyPayment(orderId, paymentId, otherSignature)).toBe(false);
    });

    it('rejects a signature generated with the wrong secret', () => {
      const forgedSignature = crypto
        .createHmac('sha256', 'attacker_secret')
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      expect(service.verifyPayment(orderId, paymentId, forgedSignature)).toBe(false);
    });
  });

  describe('verifyWebhookSignature', () => {
    const body = JSON.stringify({ event: 'payment.captured', payload: {} });

    it('accepts a signature generated with the webhook secret', () => {
      const validSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

      expect(service.verifyWebhookSignature(body, validSignature)).toBe(true);
    });

    it('rejects an invalid webhook signature', () => {
      expect(service.verifyWebhookSignature(body, 'invalid')).toBe(false);
    });

    it('rejects a signature over a modified body', () => {
      const validSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(body)
        .digest('hex');
      const tamperedBody = body.replace('captured', 'failed');

      expect(service.verifyWebhookSignature(tamperedBody, validSignature)).toBe(false);
    });
  });
});
