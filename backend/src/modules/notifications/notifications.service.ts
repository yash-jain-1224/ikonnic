import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  userId?: string;
  channel?: string;
  retries?: number;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;
  private smsClient: any;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 2000;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initializeTransporter();
  }

  private async initializeTransporter() {
    const host = this.configService.get('SMTP_HOST', 'smtp.gmail.com');
    const port = parseInt(this.configService.get('SMTP_PORT', '587'), 10);
    const user = this.configService.get('SMTP_USER');
    const pass = this.configService.get('SMTP_PASS');

    if (!user || !pass) {
      this.logger.warn('SMTP credentials not configured — email sending disabled');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });

    // Verify SMTP connection on startup
    try {
      await this.transporter.verify();
      this.logger.log(`✅ SMTP connected: ${host}:${port} as ${user}`);
    } catch (error) {
      this.logger.error(`❌ SMTP connection failed: ${(error as Error).message}`);
      this.logger.warn('Emails will retry on each send');
    }

    // Azure Communication Services - SMS (optional)
    const acsConnectionString = this.configService.get('AZURE_COMMUNICATION_CONNECTION_STRING');
    if (acsConnectionString && !acsConnectionString.includes('accesskey=xxx')) {
      try {
        const { SmsClient } = require('@azure/communication-sms');
        this.smsClient = new SmsClient(acsConnectionString);
        this.logger.log('✅ Azure SMS client initialized');
      } catch {
        this.logger.warn('Azure SMS client failed to initialize');
      }
    }
  }

  // ─── Core Email Sender with Retry ─────────────────────

  async sendEmail(options: SendEmailOptions): Promise<boolean>;
  async sendEmail(to: string, subject: string, html: string, userId?: string): Promise<boolean>;
  async sendEmail(
    toOrOptions: string | SendEmailOptions,
    subject?: string,
    html?: string,
    userId?: string,
  ): Promise<boolean> {
    const opts: SendEmailOptions =
      typeof toOrOptions === 'string'
        ? { to: toOrOptions, subject: subject!, html: html!, userId }
        : toOrOptions;

    const maxRetries = opts.retries ?? this.MAX_RETRIES;
    const from = this.configService.get('SMTP_FROM', 'Ikonnic <ikonnicdecor@gmail.com>');

    if (!this.transporter) {
      this.logger.error(`Cannot send email — SMTP not configured. To: ${opts.to}, Subject: ${opts.subject}`);
      await this.logNotification(opts.userId, 'EMAIL', opts.channel || 'transactional', opts.subject!, opts.html!, 'FAILED');
      return false;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const info = await this.transporter.sendMail({
          from,
          to: opts.to,
          subject: opts.subject,
          html: opts.html,
        });

        this.logger.log(`📧 Email sent [attempt ${attempt}] to ${opts.to}: "${opts.subject}" (msgId: ${info.messageId})`);
        await this.logNotification(opts.userId, 'EMAIL', opts.channel || 'transactional', opts.subject!, opts.html!, 'SENT');
        return true;
      } catch (error) {
        const errMsg = (error as Error).message;
        this.logger.warn(`📧 Email attempt ${attempt}/${maxRetries} failed to ${opts.to}: ${errMsg}`);

        if (attempt < maxRetries) {
          await this.sleep(this.RETRY_DELAY_MS * attempt);
        } else {
          this.logger.error(`📧 Email PERMANENTLY FAILED after ${maxRetries} attempts to ${opts.to}: "${opts.subject}"`);
          await this.logNotification(opts.userId, 'EMAIL', opts.channel || 'transactional', opts.subject!, opts.html!, 'FAILED');
        }
      }
    }
    return false;
  }

  // ─── SMS ───────────────────────────────────────────────

  async sendSms(phone: string, message: string, userId?: string) {
    if (!this.smsClient) {
      this.logger.debug(`[SMS stub] To: ${phone}, Message: ${message}`);
      return;
    }

    try {
      const senderPhone = this.configService.get('AZURE_SMS_SENDER', '');
      await this.smsClient.send({ from: senderPhone, to: [phone], message });
      this.logger.log(`📱 SMS sent to ${phone}`);
      await this.logNotification(userId, 'SMS', 'transactional', undefined, message, 'SENT');
    } catch (error) {
      this.logger.error(`📱 SMS failed to ${phone}: ${(error as Error).message}`);
      await this.logNotification(userId, 'SMS', 'transactional', undefined, message, 'FAILED');
    }
  }

  // ─── WhatsApp ──────────────────────────────────────────

  async sendWhatsApp(phone: string, templateName: string, params: Record<string, string>, userId?: string) {
    const apiKey = this.configService.get('WHATSAPP_API_KEY');
    const phoneNumberId = this.configService.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!apiKey || !phoneNumberId) {
      this.logger.debug(`[WhatsApp stub] To: ${phone}, Template: ${templateName}`);
      return;
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone.replace('+', ''),
            type: 'template',
            template: {
              name: templateName,
              language: { code: 'en' },
              components: [{ type: 'body', parameters: Object.values(params).map((val) => ({ type: 'text', text: val })) }],
            },
          }),
        },
      );

      if (response.ok) {
        this.logger.log(`WhatsApp sent to ${phone}: ${templateName}`);
      } else {
        this.logger.error(`WhatsApp failed: ${await response.text()}`);
      }
    } catch (error) {
      this.logger.error(`WhatsApp error: ${(error as Error).message}`);
    }
  }

  // ─── Template Emails ───────────────────────────────────

  async sendOrderConfirmation(
    email: string,
    orderNumber: string,
    total: number,
    userId?: string,
    phone?: string,
    items?: Array<{ title: string; quantity: number; total: number }>,
  ) {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://ikonnic.com');
    const itemsHtml = items?.map((i) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155">${i.title}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:center">${i.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right;font-weight:600">₹${i.total.toLocaleString('en-IN')}</td>
      </tr>
    `).join('') || '';

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff">
        <div style="text-align:center;margin-bottom:32px">
          <div style="display:inline-block;background:#1a1a1a;color:#fff;padding:8px 16px;font-weight:900;font-size:16px;letter-spacing:1px;border-radius:4px">IKONNIC</div>
        </div>
        <h1 style="color:#b76e79;font-size:26px;margin-bottom:8px;text-align:center">Order Confirmed! 🎉</h1>
        <p style="color:#334155;font-size:15px;line-height:1.6;text-align:center">Thank you for your order. We'll begin processing your personalised items right away.</p>
        
        <div style="background:#fffaf8;border:1px solid #fbeae3;border-radius:16px;padding:20px;margin:24px 0;text-align:center">
          <p style="margin:0;font-size:13px;color:#6b6b6b;text-transform:uppercase;letter-spacing:1px">Order Number</p>
          <p style="margin:6px 0 0;font-size:22px;font-weight:900;color:#1a1a1a">${orderNumber}</p>
          <p style="margin:12px 0 0;font-size:13px;color:#6b6b6b">Payment: Cash on Delivery</p>
          <p style="margin:8px 0 0;font-size:28px;font-weight:900;color:#b76e79">₹${total.toLocaleString('en-IN')}</p>
        </div>

        ${items && items.length > 0 ? `
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <thead><tr style="background:#fffaf8">
            <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b6b6b">Item</th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#6b6b6b">Qty</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#6b6b6b">Amount</th>
          </tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>` : ''}

        <div style="text-align:center;margin:28px 0">
          <a href="${frontendUrl}/orders-tracking?order=${orderNumber}" style="display:inline-block;background:#b76e79;color:white;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:700;font-size:14px">Track Your Order →</a>
        </div>

        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px;margin:20px 0">
          <p style="margin:0;font-size:13px;color:#166534;font-weight:600">💡 COD Tip: Please keep the exact amount ready at delivery for a smooth handover.</p>
        </div>

        <hr style="border:none;border-top:1px solid #f1f5f9;margin:28px 0" />
        <p style="color:#94a3b8;font-size:12px;text-align:center">Need help? Reply to this email or WhatsApp us.<br/>© ${new Date().getFullYear()} Ikonnic. Made with ♥ in India.</p>
      </div>
    `;

    await this.sendEmail({ to: email, subject: `Order Confirmed: ${orderNumber} ✓`, html, userId, channel: 'order_confirmation' });

    if (phone) {
      await this.sendSms(phone, `Ikonnic: Order ${orderNumber} confirmed! Total: ₹${total} (COD). Track: ${frontendUrl}/orders-tracking`, userId);
    }
  }

  async sendShippingUpdate(email: string, orderNumber: string, status: string, trackingNumber?: string, userId?: string, phone?: string) {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://ikonnic.com');
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff">
        <div style="text-align:center;margin-bottom:32px">
          <div style="display:inline-block;background:#1a1a1a;color:#fff;padding:8px 16px;font-weight:900;font-size:16px;letter-spacing:1px;border-radius:4px">IKONNIC</div>
        </div>
        <h1 style="color:#1a1a1a;font-size:24px;text-align:center">📦 Order Update</h1>
        <p style="color:#334155;font-size:15px;text-align:center">Your order <strong>${orderNumber}</strong> status:</p>
        <div style="background:#fffaf8;border:1px solid #fbeae3;border-radius:12px;padding:20px;margin:20px 0;text-align:center">
          <p style="margin:0;font-size:20px;font-weight:700;color:#b76e79">${status.replace(/_/g, ' ')}</p>
          ${trackingNumber ? `<p style="margin:10px 0 0;font-size:13px;color:#6b6b6b">Tracking: <strong>${trackingNumber}</strong></p>` : ''}
        </div>
        <div style="text-align:center;margin:24px 0">
          <a href="${frontendUrl}/orders-tracking?order=${orderNumber}" style="display:inline-block;background:#b76e79;color:white;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:700;font-size:14px">Track Order →</a>
        </div>
        <hr style="border:none;border-top:1px solid #f1f5f9;margin:28px 0" />
        <p style="color:#94a3b8;font-size:12px;text-align:center">© ${new Date().getFullYear()} Ikonnic. Made with ♥ in India.</p>
      </div>
    `;

    await this.sendEmail({ to: email, subject: `Order ${orderNumber}: ${status.replace(/_/g, ' ')}`, html, userId, channel: 'shipping_update' });
    if (phone) {
      await this.sendSms(phone, `Ikonnic: Order ${orderNumber} — ${status.replace(/_/g, ' ')}.${trackingNumber ? ` Track: ${trackingNumber}` : ''}`, userId);
    }
  }

  async sendWelcomeEmail(email: string, firstName: string, userId?: string) {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://ikonnic.com');
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff">
        <div style="text-align:center;margin-bottom:32px">
          <div style="display:inline-block;background:#1a1a1a;color:#fff;padding:8px 16px;font-weight:900;font-size:16px;letter-spacing:1px;border-radius:4px">IKONNIC</div>
        </div>
        <h1 style="color:#b76e79;font-size:26px;text-align:center">Welcome, ${firstName}! 🎊</h1>
        <p style="color:#334155;font-size:15px;line-height:1.7;text-align:center">Thanks for joining <strong>Ikonnic</strong> — India's favourite personalised gifting brand.</p>
        <div style="text-align:center;margin:28px 0">
          <a href="${frontendUrl}" style="display:inline-block;background:#b76e79;color:white;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:700;font-size:14px">Start Shopping →</a>
        </div>
        <hr style="border:none;border-top:1px solid #f1f5f9;margin:28px 0" />
        <p style="color:#94a3b8;font-size:12px;text-align:center">© ${new Date().getFullYear()} Ikonnic. Made with ♥ in India.</p>
      </div>
    `;
    await this.sendEmail({ to: email, subject: 'Welcome to Ikonnic! 🎊', html, userId, channel: 'welcome' });
  }

  async sendPasswordResetOtp(email: string, otp: string, firstName: string) {
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff">
        <div style="text-align:center;margin-bottom:32px">
          <div style="display:inline-block;background:#1a1a1a;color:#fff;padding:8px 16px;font-weight:900;font-size:16px;letter-spacing:1px;border-radius:4px">IKONNIC</div>
        </div>
        <h1 style="color:#1a1a1a;font-size:24px;text-align:center">Password Reset</h1>
        <p style="color:#334155;font-size:15px;text-align:center">Hi ${firstName}, use this code to reset your password:</p>
        <div style="background:#fffaf8;border:2px solid #fbeae3;border-radius:16px;padding:24px;margin:20px 0;text-align:center">
          <p style="margin:0;font-size:36px;font-weight:900;letter-spacing:8px;color:#b76e79">${otp}</p>
        </div>
        <p style="color:#6b6b6b;font-size:13px;text-align:center">Expires in 15 minutes. Didn't request this? Ignore this email.</p>
        <hr style="border:none;border-top:1px solid #f1f5f9;margin:28px 0" />
        <p style="color:#94a3b8;font-size:12px;text-align:center">© ${new Date().getFullYear()} Ikonnic.</p>
      </div>
    `;
    await this.sendEmail({ to: email, subject: 'Your Ikonnic Password Reset Code', html, channel: 'password_reset' });
  }

  async sendOrderCancelledEmail(email: string, orderNumber: string, reason: string, userId?: string) {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://ikonnic.com');
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff">
        <div style="text-align:center;margin-bottom:32px">
          <div style="display:inline-block;background:#1a1a1a;color:#fff;padding:8px 16px;font-weight:900;font-size:16px;letter-spacing:1px;border-radius:4px">IKONNIC</div>
        </div>
        <h1 style="color:#dc2626;font-size:24px;text-align:center">Order Cancelled</h1>
        <p style="color:#334155;font-size:15px;text-align:center">Your order <strong>${orderNumber}</strong> has been cancelled.</p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin:20px 0;text-align:center">
          <p style="margin:0;font-size:14px;color:#991b1b"><strong>Reason:</strong> ${reason}</p>
        </div>
        <div style="text-align:center;margin:24px 0">
          <a href="${frontendUrl}/contact-us" style="display:inline-block;background:#b76e79;color:white;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:700;font-size:14px">Contact Support</a>
        </div>
        <hr style="border:none;border-top:1px solid #f1f5f9;margin:28px 0" />
        <p style="color:#94a3b8;font-size:12px;text-align:center">© ${new Date().getFullYear()} Ikonnic. Made with ♥ in India.</p>
      </div>
    `;
    await this.sendEmail({ to: email, subject: `Order ${orderNumber} Cancelled`, html, userId, channel: 'order_cancelled' });
  }

  // ─── User-Facing Notification Feed ─────────────────────

  async listForUser(userId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(1, limit), 100),
      select: {
        id: true, type: true, channel: true, subject: true,
        status: true, sentAt: true, readAt: true, createdAt: true,
      },
    });
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) throw new NotFoundException('Notification not found');
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { message: 'All notifications marked as read', count: result.count };
  }

  // ─── Health Check ──────────────────────────────────────

  async checkEmailHealth(): Promise<{ healthy: boolean; message: string }> {
    if (!this.transporter) return { healthy: false, message: 'SMTP not configured' };
    try {
      await this.transporter.verify();
      return { healthy: true, message: 'SMTP connected' };
    } catch (error) {
      return { healthy: false, message: (error as Error).message };
    }
  }

  // ─── Helpers ───────────────────────────────────────────

  private async logNotification(
    userId: string | undefined,
    type: 'EMAIL' | 'SMS' | 'PUSH' | 'WHATSAPP',
    channel: string,
    subject: string | undefined,
    body: string,
    status: 'SENT' | 'FAILED',
  ) {
    try {
      await this.prisma.notification.create({
        data: {
          userId: userId || null,
          type,
          channel,
          subject,
          body: body.substring(0, 5000),
          status,
          sentAt: status === 'SENT' ? new Date() : undefined,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to log notification: ${(err as Error).message}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
