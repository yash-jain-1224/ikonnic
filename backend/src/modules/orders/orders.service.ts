import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CouponsService } from '../coupons/coupons.service';
import { NotificationsService } from '../notifications/notifications.service';
import { normalizePage, normalizeLimit } from '../../common/pagination';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private couponsService: CouponsService,
    private notifications: NotificationsService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // Generate order number
    const orderNumber = `IKN-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    // Force COD as the only payment method
    const paymentMethod = PaymentMethod.COD;

    // Load authoritative product data — NEVER trust client-supplied prices.
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Recompute every line total from server-side prices.
    let subtotal = 0;
    let taxTotal = 0;
    const orderItems = dto.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new BadRequestException(`Product not found: ${item.productId}`);
      }
      if (product.isActive === false) {
        throw new BadRequestException(`Product is not available: ${product.title}`);
      }

      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const unitPrice = product.price;
      const optionsPrice = Math.max(0, Number(item.optionsPrice) || 0);
      const lineTotal = (unitPrice + optionsPrice) * quantity;
      const taxRate = product.taxRate ?? 18;
      const lineTax = Math.round(lineTotal * (taxRate / 100) * 100) / 100;

      subtotal += lineTotal;
      taxTotal += lineTax;

      return {
        productId: product.id,
        title: product.title,
        sku: product.sku,
        quantity,
        unitPrice,
        optionsPrice,
        discount: 0,
        tax: lineTax,
        total: lineTotal,
        selectedOptions: item.selectedOptions || {},
        uploadedImageRef: item.uploadedImageRef,
        previewImage: item.previewImage,
        customisationJson: item.customisationJson,
      };
    });

    // Derive the discount from a server-validated coupon
    let discount = 0;
    let appliedCouponCode: string | undefined;
    if (dto.couponCode) {
      const validated = await this.couponsService.validateCoupon(dto.couponCode, subtotal, userId);
      discount = Math.min(validated.calculatedDiscount, subtotal);
      appliedCouponCode = validated.code;
    }

    const tax = Math.round(taxTotal * 100) / 100;
    const shippingCost = subtotal >= 999 ? 0 : 99;
    const total = Math.max(0, Math.round((subtotal + tax + shippingCost - discount) * 100) / 100);

    // Create order with items in a transaction
    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          billingAddressId: dto.billingAddressId,
          shippingAddressId: dto.shippingAddressId,
          status: OrderStatus.PAYMENT_CONFIRMED, // COD confirmed immediately
          subtotal,
          discount,
          tax,
          shippingCost,
          total,
          couponCode: appliedCouponCode,
          paymentMethod,
          customerNotes: dto.customerNotes,
          estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
          items: {
            create: orderItems,
          },
          statusHistory: {
            create: [
              { status: OrderStatus.PENDING, note: 'Order placed (COD)' },
              { status: OrderStatus.PAYMENT_CONFIRMED, note: 'COD order auto-confirmed' },
            ],
          },
        },
        include: {
          items: true,
          statusHistory: true,
          billingAddress: true,
          shippingAddress: true,
          user: { select: { email: true, phone: true, firstName: true } },
        },
      });

      // Create payment record for COD
      await tx.payment.create({
        data: {
          orderId: createdOrder.id,
          amount: total,
          currency: 'INR',
          status: PaymentStatus.PENDING,
          method: PaymentMethod.COD,
          gatewayOrderId: `COD_${orderNumber}`,
          gatewayResponse: { type: 'cod', note: 'Payment to be collected on delivery' },
          attempts: 1,
        },
      });

      // Reserve inventory. For stock-tracked products the decrement is
      // conditional (stockCount >= quantity) so concurrent orders cannot
      // oversell — a failed decrement rolls the whole order back.
      for (const item of orderItems) {
        const product = productMap.get(item.productId);
        if (product && product.stockCount != null) {
          const decremented = await tx.product.updateMany({
            where: { id: item.productId, stockCount: { gte: item.quantity } },
            data: { stockCount: { decrement: item.quantity } },
          });
          if (decremented.count === 0) {
            throw new BadRequestException(
              `Insufficient stock for "${item.title}" — only ${product.stockCount} unit(s) available`,
            );
          }
          const fresh = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stockCount: true },
          });
          if (fresh?.stockCount != null) {
            const stockStatus =
              fresh.stockCount <= 0 ? 'out_of_stock' : fresh.stockCount <= 10 ? 'low_stock' : 'in_stock';
            await tx.product.update({ where: { id: item.productId }, data: { stockStatus } });
          }
        }

        await tx.inventoryRecord.updateMany({
          where: { productId: item.productId },
          data: {
            reserved: { increment: item.quantity },
            available: { decrement: item.quantity },
          },
        });
      }

      return createdOrder;
    });

    // Record coupon usage (best-effort)
    if (appliedCouponCode) {
      try {
        await this.couponsService.applyCoupon(appliedCouponCode, userId, order.id);
      } catch {
        // Non-fatal
      }
    }

    // Invalidate user's orders cache and cached product details whose stock changed
    await this.redis.del(`user:${userId}:orders`);
    await Promise.all(products.map((p) => this.redis.del(`product:${p.slug}`)));

    // Send order confirmation email (async, non-blocking)
    this.sendOrderNotifications(order).catch((err) => {
      this.logger.error(`Failed to send order notifications: ${err.message}`);
    });

    this.logger.log(`✅ Order ${orderNumber} created for user ${userId}, total ₹${total} (COD)`);

    return order;
  }

  private async sendOrderNotifications(order: any) {
    const { user, orderNumber, total, items } = order;
    if (!user?.email) return;

    const itemsSummary = items?.map((i: any) => ({
      title: i.title,
      quantity: i.quantity,
      total: i.total,
    }));

    await this.notifications.sendOrderConfirmation(
      user.email,
      orderNumber,
      total,
      order.userId,
      user.phone,
      itemsSummary,
    );
  }

  async findUserOrders(userId: string, page = 1, limit = 10) {
    page = normalizePage(page);
    limit = normalizeLimit(limit, 10);
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        include: {
          items: {
            include: { product: { select: { slug: true, image: true } } },
          },
          statusHistory: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);

    return {
      data: orders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(orderId: string, userId?: string) {
    const where: any = { id: orderId };
    if (userId) where.userId = userId;

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        items: {
          include: { product: { select: { slug: true, image: true, title: true } } },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payments: true,
        shipment: { include: { trackingEvents: { orderBy: { timestamp: 'desc' } } } },
        billingAddress: true,
        shippingAddress: true,
        invoice: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findByOrderNumber(orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        shipment: { include: { trackingEvents: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(orderId: string, status: OrderStatus, note?: string, changedBy?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { email: true, phone: true, firstName: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    this.validateStatusTransition(order.status, status);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status,
          ...(status === OrderStatus.DELIVERED && { deliveredAt: new Date() }),
          ...(status === OrderStatus.CANCELLED && { cancelledAt: new Date(), cancelReason: note }),
        },
      });

      await tx.orderStatusHistory.create({
        data: { orderId, status, note, changedBy },
      });

      // Release stock on cancellation
      if (status === OrderStatus.CANCELLED) {
        const items = await tx.orderItem.findMany({ where: { orderId } });
        for (const item of items) {
          // Restore tracked stock counts (mirror of the order-time decrement)
          await tx.product.updateMany({
            where: { id: item.productId, stockCount: { not: null } },
            data: { stockCount: { increment: item.quantity } },
          });
          await tx.inventoryRecord.updateMany({
            where: { productId: item.productId },
            data: {
              reserved: { decrement: item.quantity },
              available: { increment: item.quantity },
            },
          });
        }
      }

      // Mark COD payment as captured on delivery
      if (status === OrderStatus.DELIVERED) {
        await tx.payment.updateMany({
          where: { orderId, method: PaymentMethod.COD },
          data: { status: PaymentStatus.CAPTURED, paidAt: new Date() },
        });
      }

      return updatedOrder;
    });

    if (status === OrderStatus.CANCELLED) {
      const items = await this.prisma.orderItem.findMany({
        where: { orderId },
        select: { productId: true },
      });
      const restocked = await this.prisma.product.findMany({
        where: { id: { in: items.map((i) => i.productId) } },
        select: { slug: true },
      });
      await Promise.all(restocked.map((p) => this.redis.del(`product:${p.slug}`)));
    }

    // Send email notification for status updates (async)
    if ((order as any).user?.email) {
      const user = (order as any).user;
      if (status === OrderStatus.CANCELLED) {
        this.notifications.sendOrderCancelledEmail(user.email, order.orderNumber, note || 'No reason provided', order.userId).catch(() => {});
      } else {
        this.notifications.sendShippingUpdate(user.email, order.orderNumber, status, undefined, order.userId, user.phone).catch(() => {});
      }
    }

    this.logger.log(`Order ${order.orderNumber} status: ${order.status} → ${status}`);
    return updated;
  }

  async cancelOrder(orderId: string, userId: string, reason: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });

    if (!order) throw new NotFoundException('Order not found');

    const cancellableStatuses: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.PAYMENT_CONFIRMED,
      OrderStatus.IMAGE_PROCESSING,
    ];

    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled at this stage');
    }

    return this.updateStatus(orderId, OrderStatus.CANCELLED, reason, userId);
  }

  async trackOrder(orderNumber: string, identifier?: string) {
    const order = await this.prisma.order.findFirst({
      where: { orderNumber },
      include: {
        statusHistory: { orderBy: { createdAt: 'asc' } },
        shipment: { include: { trackingEvents: { orderBy: { timestamp: 'desc' } } } },
        items: { select: { title: true, quantity: true, previewImage: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    if (identifier) {
      const user = await this.prisma.user.findFirst({
        where: {
          id: order.userId,
          OR: [{ email: identifier }, { phone: identifier }],
        },
      });
      if (!user) throw new NotFoundException('Order not found for this email/phone');
    }

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentMethod: order.paymentMethod,
      total: order.total,
      createdAt: order.createdAt,
      estimatedDelivery: order.estimatedDelivery,
      trackingEvents: order.statusHistory.map((h) => ({
        status: h.status,
        timestamp: h.createdAt,
        note: h.note,
      })),
      shipment: order.shipment,
      items: order.items,
    };
  }

  private validateStatusTransition(current: OrderStatus, next: OrderStatus) {
    const validTransitions: Record<string, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PAYMENT_CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.PAYMENT_CONFIRMED]: [OrderStatus.IMAGE_PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.IMAGE_PROCESSING]: [OrderStatus.DESIGN_APPROVAL, OrderStatus.CANCELLED],
      [OrderStatus.DESIGN_APPROVAL]: [OrderStatus.PRINTING, OrderStatus.REPRINT_INITIATED, OrderStatus.CANCELLED],
      [OrderStatus.PRINTING]: [OrderStatus.QUALITY_CHECK, OrderStatus.REPRINT_INITIATED],
      [OrderStatus.QUALITY_CHECK]: [OrderStatus.PACKING, OrderStatus.REPRINT_INITIATED],
      [OrderStatus.PACKING]: [OrderStatus.SHIPPED],
      [OrderStatus.SHIPPED]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.RETURNED],
      [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.RETURNED],
      [OrderStatus.DELIVERED]: [OrderStatus.RETURNED, OrderStatus.REFUNDED],
      [OrderStatus.RETURNED]: [OrderStatus.REFUNDED, OrderStatus.REPRINT_INITIATED],
      [OrderStatus.REPRINT_INITIATED]: [OrderStatus.PRINTING],
    };

    const allowed = validTransitions[current] || [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(`Cannot transition from ${current} to ${next}`);
    }
  }
}
