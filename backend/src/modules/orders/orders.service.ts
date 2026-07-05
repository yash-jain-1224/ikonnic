import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    // Generate order number
    const orderNumber = `GFT-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    // Calculate totals
    let subtotal = 0;
    const orderItems = dto.items.map((item) => {
      const itemTotal = (item.unitPrice + (item.optionsPrice || 0) - (item.discount || 0)) * item.quantity;
      subtotal += itemTotal;
      return {
        productId: item.productId,
        title: item.title,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        optionsPrice: item.optionsPrice || 0,
        discount: item.discount || 0,
        tax: Math.round(item.unitPrice * item.quantity * 0.18 * 100) / 100, // 18% GST
        total: itemTotal,
        selectedOptions: item.selectedOptions || {},
        uploadedImageRef: item.uploadedImageRef,
        previewImage: item.previewImage,
        customisationJson: item.customisationJson,
      };
    });

    const tax = Math.round(subtotal * 0.18 * 100) / 100;
    const shippingCost = subtotal >= 999 ? 0 : 99; // Free shipping above 999
    const discount = dto.discount || 0;
    const total = subtotal + tax + shippingCost - discount;

    // Create order with items in a transaction
    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          billingAddressId: dto.billingAddressId,
          shippingAddressId: dto.shippingAddressId,
          status: OrderStatus.PENDING,
          subtotal,
          discount,
          tax,
          shippingCost,
          total,
          couponCode: dto.couponCode,
          paymentMethod: dto.paymentMethod as any,
          customerNotes: dto.customerNotes,
          items: {
            create: orderItems,
          },
          statusHistory: {
            create: {
              status: OrderStatus.PENDING,
              note: 'Order created',
            },
          },
        },
        include: {
          items: true,
          statusHistory: true,
          billingAddress: true,
          shippingAddress: true,
        },
      });

      // Reserve inventory
      for (const item of orderItems) {
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

    // Invalidate user's orders cache
    await this.redis.del(`user:${userId}:orders`);

    return order;
  }

  async findUserOrders(userId: string, page = 1, limit = 10) {
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
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    // Validate state transition
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
        data: {
          orderId,
          status,
          note,
          changedBy,
        },
      });

      // Handle stock on cancellation
      if (status === OrderStatus.CANCELLED) {
        const items = await tx.orderItem.findMany({ where: { orderId } });
        for (const item of items) {
          await tx.inventoryRecord.updateMany({
            where: { productId: item.productId },
            data: {
              reserved: { decrement: item.quantity },
              available: { increment: item.quantity },
            },
          });
        }
      }

      return updatedOrder;
    });

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
    const where: any = { orderNumber };

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        statusHistory: { orderBy: { createdAt: 'asc' } },
        shipment: { include: { trackingEvents: { orderBy: { timestamp: 'desc' } } } },
        items: { select: { title: true, quantity: true, previewImage: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    // Verify access if identifier provided
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
