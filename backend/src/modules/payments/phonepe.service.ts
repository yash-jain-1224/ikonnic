import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class PhonePeService {
  private readonly logger = new Logger(PhonePeService.name);
  private merchantId: string;
  private saltKey: string;
  private saltIndex: string;
  private baseUrl: string;
  private callbackUrl: string;
  private redirectUrl: string;

  constructor(private configService: ConfigService) {
    this.merchantId = this.configService.get('PHONEPE_MERCHANT_ID', '');
    this.saltKey = this.configService.get('PHONEPE_SALT_KEY', '');
    this.saltIndex = this.configService.get('PHONEPE_SALT_INDEX', '1');
    // Use production URL by default; set to sandbox for testing
    this.baseUrl = this.configService.get(
      'PHONEPE_BASE_URL',
      'https://api.phonepe.com/apis/hermes',
    );
    this.callbackUrl = this.configService.get('PHONEPE_CALLBACK_URL', '');
    this.redirectUrl = this.configService.get('PHONEPE_REDIRECT_URL', '');
  }

  /** True when merchant credentials are present. */
  isConfigured(): boolean {
    return Boolean(this.merchantId && this.saltKey);
  }

  /** Fail fast with a clear message when merchant onboarding is incomplete. */
  private assertConfigured() {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Online payment is temporarily unavailable. Please use Cash on Delivery or try again later.',
      );
    }
  }

  /**
   * Generate the X-VERIFY checksum header for PhonePe API requests.
   */
  private generateChecksum(payload: string, endpoint: string): string {
    const string = payload + endpoint + this.saltKey;
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    return `${sha256}###${this.saltIndex}`;
  }

  /**
   * Verify callback/webhook signature from PhonePe.
   */
  verifyChecksum(responseBase64: string, xVerifyHeader: string): boolean {
    const string = responseBase64 + '/pg/v1/status/' + this.saltKey;
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    const expected = `${sha256}###${this.saltIndex}`;
    return expected === xVerifyHeader;
  }

  /**
   * Initiate a payment — returns a redirect URL for the customer.
   */
  async initiatePayment(
    amount: number,
    merchantTransactionId: string,
    merchantUserId: string,
  ): Promise<{ redirectUrl: string; merchantTransactionId: string }> {
    this.assertConfigured();
    const payload = {
      merchantId: this.merchantId,
      merchantTransactionId,
      merchantUserId,
      amount: Math.round(amount * 100), // Amount in paise
      redirectUrl: `${this.redirectUrl}?txnId=${merchantTransactionId}`,
      redirectMode: 'REDIRECT',
      callbackUrl: this.callbackUrl,
      paymentInstrument: {
        type: 'PAY_PAGE',
      },
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const checksum = this.generateChecksum(payloadBase64, '/pg/v1/pay');

    const response = await fetch(`${this.baseUrl}/pg/v1/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
      },
      body: JSON.stringify({ request: payloadBase64 }),
    });

    const data = await response.json();

    if (!data.success) {
      this.logger.error('PhonePe initiation failed', data);
      throw new Error(data.message || 'PhonePe payment initiation failed');
    }

    const redirectUrl =
      data.data?.instrumentResponse?.redirectInfo?.url || '';

    return { redirectUrl, merchantTransactionId };
  }

  /**
   * Check payment status using the merchantTransactionId.
   */
  async checkStatus(merchantTransactionId: string): Promise<{
    success: boolean;
    state: string;
    transactionId?: string;
    amount?: number;
    paymentInstrument?: any;
  }> {
    this.assertConfigured();
    const endpoint = `/pg/v1/status/${this.merchantId}/${merchantTransactionId}`;
    const string = endpoint + this.saltKey;
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    const checksum = `${sha256}###${this.saltIndex}`;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': this.merchantId,
      },
    });

    const data = await response.json();

    return {
      success: data.success && data.code === 'PAYMENT_SUCCESS',
      state: data.data?.state || data.code || 'UNKNOWN',
      transactionId: data.data?.transactionId,
      amount: data.data?.amount ? data.data.amount / 100 : undefined,
      paymentInstrument: data.data?.paymentInstrument,
    };
  }

  /**
   * Initiate a refund via PhonePe.
   * @param originalTransactionId the merchantTransactionId the original payment was initiated with
   */
  async initiateRefund(
    originalTransactionId: string,
    amount: number,
  ): Promise<{ success: boolean; refundTransactionId: string }> {
    this.assertConfigured();
    const refundTxnId = `REFUND_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const payload = {
      merchantId: this.merchantId,
      merchantUserId: 'SYSTEM',
      originalTransactionId,
      merchantTransactionId: refundTxnId,
      amount: Math.round(amount * 100), // paise
      callbackUrl: this.callbackUrl,
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const checksum = this.generateChecksum(payloadBase64, '/pg/v1/refund');

    const response = await fetch(`${this.baseUrl}/pg/v1/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
      },
      body: JSON.stringify({ request: payloadBase64 }),
    });

    const data = await response.json();

    if (!data.success) {
      this.logger.error('PhonePe refund failed', data);
      throw new Error(data.message || 'PhonePe refund initiation failed');
    }

    return { success: true, refundTransactionId: refundTxnId };
  }

  /**
   * Verify a webhook callback from PhonePe.
   */
  verifyWebhookSignature(base64Response: string, xVerifyHeader: string): boolean {
    const string = base64Response + this.saltKey;
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    const expected = `${sha256}###${this.saltIndex}`;
    return expected === xVerifyHeader;
  }
}
