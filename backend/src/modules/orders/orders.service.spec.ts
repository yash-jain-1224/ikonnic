import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CouponsService } from '../coupons/coupons.service';

describe('OrdersService', () => {
  let service: OrdersService;

  const txMock = {
    order: { create: jest.fn(), update: jest.fn() },
    orderItem: { findMany: jest.fn() },
    orderStatusHistory: { create: jest.fn() },
    inventoryRecord: { updateMany: jest.fn() },
  };

  const prismaMock = {
    order: { findFirst: jest.fn(), findUnique: jest.fn() },
    product: { findMany: jest.fn() },
    $transaction: jest.fn(async (cb: (tx: typeof txMock) => Promise<unknown>) => cb(txMock)),
  };

  const redisMock = { del: jest.fn() };
  const couponsMock = { validateCoupon: jest.fn(), applyCoupon: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    txMock.order.create.mockImplementation(async ({ data }: any) => ({ id: 'o1', ...data }));
    txMock.order.update.mockImplementation(async ({ data }: any) => ({ id: 'o1', ...data }));
    txMock.orderItem.findMany.mockResolvedValue([]);
    txMock.orderStatusHistory.create.mockResolvedValue({});
    txMock.inventoryRecord.updateMany.mockResolvedValue({});
    // Authoritative product prices come from the DB, never the client payload.
    prismaMock.product.findMany.mockResolvedValue([
      { id: 'p1', title: 'Acrylic Wall Photo', sku: null, price: 500, taxRate: 18, isActive: true },
    ]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: RedisService, useValue: redisMock },
        { provide: CouponsService, useValue: couponsMock },
      ],
    }).compile();

    service = moduleRef.get(OrdersService);
  });

  describe('createOrder', () => {
    const baseDto = {
      billingAddressId: 'addr1',
      shippingAddressId: 'addr1',
      paymentMethod: 'RAZORPAY',
      items: [
        {
          productId: 'p1',
          title: 'Acrylic Wall Photo',
          quantity: 2,
          unitPrice: 500,
          optionsPrice: 100,
          discount: 0,
        },
      ],
    };

    it('recalculates totals server-side (subtotal, 18% GST, free shipping above 999)', async () => {
      // A raw client-supplied discount must be IGNORED — discount only comes
      // from a server-validated coupon.
      await service.createOrder('u1', { ...baseDto, discount: 100 } as any);

      const orderData = txMock.order.create.mock.calls[0][0].data;
      // (500 + 100) * 2 = 1200 using the server product price of 500
      expect(orderData.subtotal).toBe(1200);
      expect(orderData.tax).toBe(216); // 18% of 1200
      expect(orderData.shippingCost).toBe(0); // free above 999
      expect(orderData.discount).toBe(0); // client discount ignored, no coupon
      expect(orderData.total).toBe(1416); // 1200 + 216 + 0 - 0
      expect(orderData.status).toBe(OrderStatus.PENDING);
      expect(orderData.orderNumber).toMatch(/^GFT-\d{4}-/);
    });

    it('ignores a tampered client unitPrice and uses the DB product price', async () => {
      const dto = {
        ...baseDto,
        items: [{ productId: 'p1', title: 'Acrylic Wall Photo', quantity: 1, unitPrice: 1 }],
      };

      await service.createOrder('u1', dto as any);

      const orderData = txMock.order.create.mock.calls[0][0].data;
      // Server price 500 wins over the tampered unitPrice of 1
      expect(orderData.subtotal).toBe(500);
      expect(orderData.items.create[0].unitPrice).toBe(500);
    });

    it('applies a server-validated coupon discount when a coupon code is supplied', async () => {
      couponsMock.validateCoupon.mockResolvedValue({ code: 'WELCOME10', calculatedDiscount: 120 });

      await service.createOrder('u1', { ...baseDto, couponCode: 'welcome10' } as any);

      const orderData = txMock.order.create.mock.calls[0][0].data;
      expect(couponsMock.validateCoupon).toHaveBeenCalledWith('welcome10', 1200, 'u1');
      expect(orderData.discount).toBe(120);
      expect(orderData.couponCode).toBe('WELCOME10');
      expect(orderData.total).toBe(1200 + 216 + 0 - 120);
    });

    it('charges ₹99 shipping below the free-shipping threshold', async () => {
      const dto = {
        ...baseDto,
        items: [{ productId: 'p1', title: 'Keychain', quantity: 1, unitPrice: 500 }],
      };

      await service.createOrder('u1', dto as any);

      const orderData = txMock.order.create.mock.calls[0][0].data;
      expect(orderData.subtotal).toBe(500);
      expect(orderData.shippingCost).toBe(99);
      expect(orderData.total).toBe(500 + 90 + 99);
    });

    it('reserves inventory for every item inside the transaction', async () => {
      await service.createOrder('u1', baseDto as any);

      expect(txMock.inventoryRecord.updateMany).toHaveBeenCalledWith({
        where: { productId: 'p1' },
        data: {
          reserved: { increment: 2 },
          available: { decrement: 2 },
        },
      });
      expect(redisMock.del).toHaveBeenCalledWith('user:u1:orders');
    });
  });

  describe('cancelOrder', () => {
    it('throws NotFoundException when the order does not belong to the user', async () => {
      prismaMock.order.findFirst.mockResolvedValue(null);

      await expect(service.cancelOrder('o1', 'u1', 'changed my mind')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects cancellation after production has started', async () => {
      prismaMock.order.findFirst.mockResolvedValue({ id: 'o1', status: OrderStatus.SHIPPED });

      await expect(service.cancelOrder('o1', 'u1', 'too late')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('cancels a PENDING order and releases reserved inventory', async () => {
      prismaMock.order.findFirst.mockResolvedValue({ id: 'o1', status: OrderStatus.PENDING });
      prismaMock.order.findUnique.mockResolvedValue({ id: 'o1', status: OrderStatus.PENDING });
      txMock.orderItem.findMany.mockResolvedValue([{ productId: 'p1', quantity: 2 }]);

      await service.cancelOrder('o1', 'u1', 'changed my mind');

      expect(txMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'o1' },
          data: expect.objectContaining({ status: OrderStatus.CANCELLED }),
        }),
      );
      expect(txMock.inventoryRecord.updateMany).toHaveBeenCalledWith({
        where: { productId: 'p1' },
        data: {
          reserved: { decrement: 2 },
          available: { increment: 2 },
        },
      });
    });
  });

  describe('updateStatus', () => {
    it('throws NotFoundException for an unknown order', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);

      await expect(service.updateStatus('missing', OrderStatus.SHIPPED)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects invalid status transitions', async () => {
      prismaMock.order.findUnique.mockResolvedValue({ id: 'o1', status: OrderStatus.PENDING });

      await expect(service.updateStatus('o1', OrderStatus.DELIVERED)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('allows valid transitions and records status history', async () => {
      prismaMock.order.findUnique.mockResolvedValue({ id: 'o1', status: OrderStatus.PENDING });

      await service.updateStatus('o1', OrderStatus.PAYMENT_CONFIRMED, 'paid', 'system');

      expect(txMock.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: 'o1',
          status: OrderStatus.PAYMENT_CONFIRMED,
          note: 'paid',
          changedBy: 'system',
        },
      });
    });
  });
});
