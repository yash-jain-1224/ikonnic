import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Remove guest carts that haven't been updated in 7+ days.
   */
  async cleanupAbandonedCarts() {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { count } = await this.prisma.cart.deleteMany({
      where: {
        userId: null,
        updatedAt: { lt: cutoff },
      },
    });
    return { count, message: `Deleted ${count} abandoned guest carts` };
  }

  /**
   * Remove expired or used OTP records older than 24 hours.
   */
  async cleanupExpiredOtps() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { count } = await this.prisma.otpVerification.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isUsed: true, createdAt: { lt: cutoff } },
        ],
      },
    });
    return { count, message: `Deleted ${count} expired/used OTPs` };
  }

  /**
   * Send review request emails for orders delivered 7 days ago.
   * Uses a notification record check to avoid double-sending.
   */
  async sendReviewRequests() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

    // Find delivered orders in the 7–8 day window that haven't had a review-request notification.
    const deliveredOrders = await this.prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        deliveredAt: {
          gte: eightDaysAgo,
          lte: sevenDaysAgo,
        },
      },
      include: {
        user: { select: { id: true, email: true, firstName: true } },
        items: { select: { title: true } },
      },
      take: 50,
    });

    let sent = 0;
    for (const order of deliveredOrders) {
      if (!order.user?.email) continue;

      // Check if we already sent a review request for this order
      const alreadySent = await this.prisma.notification.findFirst({
        where: {
          userId: order.user.id,
          channel: 'review_request',
          subject: { contains: order.orderNumber },
        },
      });
      if (alreadySent) continue;

      try {
        const productNames = order.items.map((i: { title: string }) => i.title).slice(0, 3).join(', ');
        const subject = `How was your order ${order.orderNumber}? Leave a review! ⭐`;
        const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <h2>Hi ${order.user.firstName},</h2>
            <p>We hope you're loving your order (<strong>${order.orderNumber}</strong>)!</p>
            <p>Items: ${productNames}</p>
            <p>We'd love to hear your feedback — it helps other customers and our artisans.</p>
            <a href="https://ikonnic.com/orders-tracking?order=${order.orderNumber}" style="display:inline-block;background:#e11d48;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700">Leave a Review</a>
          </div>`;

        await this.notifications.sendEmail(order.user.email, subject, html, order.user.id);

        // Mark as sent via a notification record
        await this.prisma.notification.create({
          data: {
            userId: order.user.id,
            type: 'EMAIL',
            channel: 'review_request',
            subject,
            body: html,
            status: 'SENT',
            sentAt: new Date(),
          },
        });
        sent++;
      } catch (err) {
        this.logger.warn(`Failed to send review request for order ${order.orderNumber}: ${(err as Error).message}`);
      }
    }

    return { count: sent, message: `Sent ${sent} review request emails` };
  }

  /**
   * Revoke all expired refresh tokens (cleanup).
   */
  async revokeExpiredTokens() {
    const { count } = await this.prisma.refreshToken.updateMany({
      where: {
        isRevoked: false,
        expiresAt: { lt: new Date() },
      },
      data: { isRevoked: true },
    });
    return { count, message: `Revoked ${count} expired refresh tokens` };
  }
}
