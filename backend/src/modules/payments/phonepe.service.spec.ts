import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PhonePeService } from './phonepe.service';

describe('PhonePeService', () => {
  let service: PhonePeService;

  const SALT_KEY = 'test_salt_key';
  const SALT_INDEX = '1';
  const MERCHANT_ID = 'TEST_MERCHANT';

  const configMock = {
    get: jest.fn((key: string, def = '') => {
      const values: Record<string, string> = {
        PHONEPE_MERCHANT_ID: MERCHANT_ID,
        PHONEPE_SALT_KEY: SALT_KEY,
        PHONEPE_SALT_INDEX: SALT_INDEX,
        PHONEPE_BASE_URL: 'https://api-preprod.phonepe.com/apis/pg-sandbox',
        PHONEPE_CALLBACK_URL: 'https://example.com/webhook',
        PHONEPE_REDIRECT_URL: 'https://example.com/checkout/verify',
      };
      return values[key] ?? def;
    }),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PhonePeService, { provide: ConfigService, useValue: configMock }],
    }).compile();

    service = moduleRef.get(PhonePeService);
  });

  describe('verifyWebhookSignature', () => {
    it('accepts a valid webhook signature', () => {
      const base64Response = Buffer.from(JSON.stringify({ code: 'PAYMENT_SUCCESS' })).toString('base64');
      const expectedHash = crypto.createHash('sha256').update(base64Response + SALT_KEY).digest('hex');
      const xVerify = `${expectedHash}###${SALT_INDEX}`;

      expect(service.verifyWebhookSignature(base64Response, xVerify)).toBe(true);
    });

    it('rejects an invalid webhook signature', () => {
      const base64Response = Buffer.from(JSON.stringify({ code: 'PAYMENT_SUCCESS' })).toString('base64');
      expect(service.verifyWebhookSignature(base64Response, 'invalid###1')).toBe(false);
    });

    it('rejects a signature with wrong salt index', () => {
      const base64Response = Buffer.from(JSON.stringify({ code: 'PAYMENT_SUCCESS' })).toString('base64');
      const expectedHash = crypto.createHash('sha256').update(base64Response + SALT_KEY).digest('hex');
      const xVerify = `${expectedHash}###2`; // Wrong index

      expect(service.verifyWebhookSignature(base64Response, xVerify)).toBe(false);
    });

    it('rejects a signature generated with wrong salt key', () => {
      const base64Response = Buffer.from(JSON.stringify({ code: 'PAYMENT_SUCCESS' })).toString('base64');
      const forgedHash = crypto.createHash('sha256').update(base64Response + 'wrong_salt').digest('hex');
      const xVerify = `${forgedHash}###${SALT_INDEX}`;

      expect(service.verifyWebhookSignature(base64Response, xVerify)).toBe(false);
    });
  });

  describe('verifyChecksum', () => {
    it('validates a status check response checksum', () => {
      const responseBase64 = Buffer.from(JSON.stringify({ success: true })).toString('base64');
      const string = responseBase64 + '/pg/v1/status/' + SALT_KEY;
      const sha256 = crypto.createHash('sha256').update(string).digest('hex');
      const xVerify = `${sha256}###${SALT_INDEX}`;

      expect(service.verifyChecksum(responseBase64, xVerify)).toBe(true);
    });

    it('rejects an invalid checksum', () => {
      const responseBase64 = Buffer.from(JSON.stringify({ success: true })).toString('base64');
      expect(service.verifyChecksum(responseBase64, 'deadbeef###1')).toBe(false);
    });
  });
});
