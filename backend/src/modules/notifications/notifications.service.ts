import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;
  private smsClient: any;
  private emailClient: any;

  constructor(private prisma: PrismaService, private configService: ConfigService) {
    // SMTP transporter (fallback or primary)
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });

    // Azure Communication Services - SMS
    const acsConnectionString = this.configService.get('AZURE_COMMUNICATION_CONNECTION_STRING');
    if (acsConnectionString) {
      try {
        const { SmsClient } = require('@azure/communication-sms');
        this.smsClient = new SmsClient(acsConnectionString);
        this.logger.log('Azure SMS client initialized');
      } catch {
        this.logger.warn('Azure SMS client failed to initialize');
      }
    }
  }

  // ─── Email ─────────────────────────────────────────────

  async sendEmail(to: string, subject: string, html: string, userId?: string) {
    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM', 'Ikonnic <noreply@ikonnic.com>'),
        to, subject, html,
      });

      this.logger.log(`Email sent to ${to}: ${subject}`);

      if (userId) {
        await this.prisma.notification.create({
          data: { userId, type: 'EMAIL', channel: 'transactional', subject, body: html, status: 'SENT', sentAt: new Date() },
        });
      }
    } catch (error) {
      this.logger.error(`Email send failed to ${to}: ${(error as Error).message}`);
      if (userId) {
        await this.prisma.notification.create({
          data: { userId, type: 'EMAIL', channel: 'transactional', subject, body: html, status: 'FAILED' },
        });
      }
    }
  }

  // ─── SMS (Azure Communication Services) ───────────────

  async sendSms(phone: string, message: string, userId?: string) {
    if (!this.smsClient) {
      this.logger.warn(`[SMS STUB] To: ${phone}, Message: ${message}`);
      return;
    }

    try {
      const senderPhone = this.configService.get('AZURE_SMS_SENDER', '');
      await this.smsClient.send({
        from: senderPhone,
        to: [phone],
        message,
      });
      this.logger.log(`SMS sent to ${phone}`);

      if (userId) {
        await this.prisma.notification.create({
          data: { userId, type: 'SMS', channel: 'transactional', body: message, status: 'SENT', sentAt: new Date() },
        });
      }
    } catch (error) {
      this.logger.error(`SMS send failed to ${phone}: ${(error as Error).message}`);
      if (userId) {
        await this.prisma.notification.create({
          data: { userId, type: 'SMS', channel: 'transactional', body: message, status: 'FAILED' },
        });
      }
    }
  }

  // ─── WhatsApp (via WhatsApp Business API / Azure) ──────

  async sendWhatsApp(phone: string, templateName: string, params: Record<string, string>, userId?: string) {
    const apiKey = this.configService.get('WHATSAPP_API_KEY');
    const phoneNumberId = this.configService.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!apiKey || !phoneNumberId) {
      this.logger.warn(`[WhatsApp STUB] To: ${phone}, Template: ${templateName}, Params: ${JSON.stringify(params)}`);
      return;
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone.replace('+', ''),
            type: 'template',
            template: {
              name: templateName,
              language: { code: 'en' },
              components: [
                {
                  type: 'body',
                  parameters: Object.values(params).map((val) => ({ type: 'text', text: val })),
                },
              ],
            },
          }),
        },
      );

      if (response.ok) {
        this.logger.log(`WhatsApp sent to ${phone}: ${templateName}`);
        if (userId) {
          await this.prisma.notification.create({
            data: { userId, type: 'WHATSAPP', channel: templateName, body: JSON.stringify(params), status: 'SENT', sentAt: new Date() },
          });
        }
      } else {
        const errorData = await response.text();
        this.logger.error(`WhatsApp failed: ${errorData}`);
      }
    } catch (error) {
      this.logger.error(`WhatsApp send failed: ${(error as Error).message}`);
    }
  }

  // ─── Template Emails ───────────────────────────────────

  async sendOrderConfirmation(email: string, orderNumber: string, total: number, userId?: string, phone?: string) {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://ikonnic.com');
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="text-align:center;margin-bottom:24px">
          <span style="background:#000;color:#fff;padding:6px 12px;font-weight:900;font-size:14px;letter-spacing:1px">IKONNIC</span>
        </div>
        <h1 style="color:#e11d48;font-size:24px;margin-bottom:8px">Order Confirmed! 🎉</h1>
        <p style="color:#334155;font-size:15px;line-height:1.6">Thank you for your order <strong>${orderNumber}</strong>.</p>
        <div style="background:#f8fafc;border-radius:12px;padding:16px;margin:16px 0">
          <p style="margin:0;font-size:14px;color:#64748b">Order Total</p>
          <p style="margin:4px 0 0;font-size:24px;font-weight:900;color:#0f172a">₹${total.toLocaleString('en-IN')}</p>
        </div>
        <p style="color:#334155;font-size:15px">We'll start processing your personalised items right away. You'll receive updates as your order progresses.</p>
        <a href="${frontendUrl}/orders-tracking?order=${orderNumber}" style="display:inline-block;background:#e11d48;color:white;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:700;font-size:14px;margin-top:16px">Track Your Order</a>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
        <p style="color:#94a3b8;font-size:12px;text-align:center">© ${new Date().getFullYear()} Ikonnic. Made with ♥ in India.</p>
      </div>
    `;
    await this.sendEmail(email, `Order Confirmed: ${orderNumber}`, html, userId);

    // Also send SMS
    if (phone) {
      await this.sendSms(phone, `Ikonnic: Order ${orderNumber} confirmed! Total: ₹${total}. Track at ${frontendUrl}/orders-tracking`, userId);
    }

    // Also send WhatsApp
    if (phone) {
      await this.sendWhatsApp(phone, 'order_confirmation', { order_number: orderNumber, total: `₹${total}` }, userId);
    }
  }

  async sendShippingUpdate(email: string, orderNumber: string, status: string, trackingNumber?: string, userId?: string, phone?: string) {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://ikonnic.com');
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="text-align:center;margin-bottom:24px">
          <span style="background:#000;color:#fff;padding:6px 12px;font-weight:900;font-size:14px;letter-spacing:1px">IKONNIC</span>
        </div>
        <h1 style="color:#e11d48;font-size:24px;margin-bottom:8px">Shipping Update 📦</h1>
        <p style="color:#334155;font-size:15px">Your order <strong>${orderNumber}</strong> status has been updated:</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:16px 0">
          <p style="margin:0;font-size:18px;font-weight:700;color:#166534">${status}</p>
          ${trackingNumber ? `<p style="margin:8px 0 0;font-size:13px;color:#64748b">Tracking: ${trackingNumber}</p>` : ''}
        </div>
        <a href="${frontendUrl}/orders-tracking?order=${orderNumber}" style="display:inline-block;background:#e11d48;color:white;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:700;font-size:14px;margin-top:12px">Track Order</a>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
        <p style="color:#94a3b8;font-size:12px;text-align:center">© ${new Date().getFullYear()} Ikonnic. Made with ♥ in India.</p>
      </div>
    `;
    await this.sendEmail(email, `Order ${orderNumber}: ${status}`, html, userId);

    if (phone) {
      await this.sendSms(phone, `Ikonnic: Order ${orderNumber} is now "${status}".${trackingNumber ? ` Track: ${trackingNumber}` : ''} Details: ${frontendUrl}/orders-tracking`, userId);
    }
  }

  async sendWelcomeEmail(email: string, firstName: string, userId?: string) {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://ikonnic.com');
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="text-align:center;margin-bottom:24px">
          <span style="background:#000;color:#fff;padding:6px 12px;font-weight:900;font-size:14px;letter-spacing:1px">IKONNIC</span>
        </div>
        <h1 style="color:#e11d48;font-size:24px">Welcome, ${firstName}! 🎊</h1>
        <p style="color:#334155;font-size:15px;line-height:1.6">Thanks for joining Ikonnic — India's favourite personalised gifting brand.</p>
        <p style="color:#334155;font-size:15px;line-height:1.6">From custom acrylic photos to wall décor, every piece is made with your memories in mind.</p>
        <a href="${frontendUrl}" style="display:inline-block;background:#e11d48;color:white;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:700;font-size:14px;margin-top:16px">Start Shopping</a>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
        <p style="color:#94a3b8;font-size:12px;text-align:center">© ${new Date().getFullYear()} Ikonnic. Made with ♥ in India.</p>
      </div>
    `;
    await this.sendEmail(email, 'Welcome to Ikonnic! 🎊', html, userId);
  }

  async sendPasswordResetOtp(email: string, otp: string, firstName: string) {
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="text-align:center;margin-bottom:24px">
          <span style="background:#000;color:#fff;padding:6px 12px;font-weight:900;font-size:14px;letter-spacing:1px">IKONNIC</span>
        </div>
        <h1 style="color:#0f172a;font-size:24px">Password Reset</h1>
        <p style="color:#334155;font-size:15px">Hi ${firstName}, use this OTP to reset your password:</p>
        <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:16px 0;text-align:center">
          <p style="margin:0;font-size:32px;font-weight:900;letter-spacing:8px;color:#e11d48">${otp}</p>
        </div>
        <p style="color:#64748b;font-size:13px">This code expires in 15 minutes. If you didn't request this, ignore this email.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
        <p style="color:#94a3b8;font-size:12px;text-align:center">© ${new Date().getFullYear()} Ikonnic.</p>
      </div>
    `;
    await this.sendEmail(email, 'Your Ikonnic Password Reset Code', html);
  }
}
