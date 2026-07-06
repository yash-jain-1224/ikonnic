import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryTransactionType } from '@prisma/client';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { OrdersService } from '../orders/orders.service';

describe('AdminService — inventory', () => {
  let service: AdminService;

  const prismaMock = {
    product: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn() },
    warehouse: { findFirst: jest.fn(), create: jest.fn() },
    inventoryRecord: { upsert: jest.fn() },
    inventoryTransaction: { create: jest.fn(), findMany: jest.fn() },
    coupon: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    order: { findMany: jest.fn(), groupBy: jest.fn() },
    orderItem: { groupBy: jest.fn() },
    user: { count: jest.fn() },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };

  const warehouse = { id: 'w1', name: 'Main Warehouse', code: 'MAIN', isActive: true };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.warehouse.findFirst.mockResolvedValue(warehouse);
    prismaMock.product.update.mockImplementation(async ({ data }: any) => ({ id: 'p1', ...data }));
    prismaMock.inventoryRecord.upsert.mockResolvedValue({});
    prismaMock.inventoryTransaction.create.mockResolvedValue({});

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: RedisService, useValue: { del: jest.fn() } },
        { provide: OrdersService, useValue: { updateStatus: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(AdminService);
  });

  describe('adjustInventory', () => {
    it('throws NotFoundException for an unknown product', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      await expect(service.adjustInventory('missing', { delta: 5 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects adjustments that would make stock negative', async () => {
      prismaMock.product.findUnique.mockResolvedValue({ id: 'p1', stockCount: 3 });

      await expect(service.adjustInventory('p1', { delta: -5 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('records a STOCK_IN transaction and updates counts for a positive delta', async () => {
      prismaMock.product.findUnique.mockResolvedValue({ id: 'p1', stockCount: 5 });

      const result = await service.adjustInventory('p1', { delta: 20, note: 'restock' }, 'admin1');

      expect(prismaMock.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { stockCount: 25, stockStatus: 'in_stock' },
      });
      expect(prismaMock.inventoryRecord.upsert).toHaveBeenCalledWith({
        where: { productId_warehouseId: { productId: 'p1', warehouseId: 'w1' } },
        create: { productId: 'p1', warehouseId: 'w1', quantity: 25, reserved: 0, available: 25 },
        update: { quantity: 25, available: { increment: 20 } },
      });
      expect(prismaMock.inventoryTransaction.create).toHaveBeenCalledWith({
        data: {
          productId: 'p1',
          warehouseId: 'w1',
          type: InventoryTransactionType.STOCK_IN,
          quantity: 20,
          note: 'restock',
          referenceId: 'admin1',
        },
      });
      expect(result.change).toBe(20);
      expect(result.stockStatus).toBe('in_stock');
    });

    it('records STOCK_OUT and flags low_stock when a negative delta drops below the threshold', async () => {
      prismaMock.product.findUnique.mockResolvedValue({ id: 'p1', stockCount: 15 });

      const result = await service.adjustInventory('p1', { delta: -10 });

      expect(prismaMock.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { stockCount: 5, stockStatus: 'low_stock' },
      });
      const txData = prismaMock.inventoryTransaction.create.mock.calls[0][0].data;
      expect(txData.type).toBe(InventoryTransactionType.STOCK_OUT);
      expect(txData.quantity).toBe(10);
      expect(result.stockStatus).toBe('low_stock');
    });

    it('records ADJUSTMENT and flags out_of_stock for an absolute set to zero', async () => {
      prismaMock.product.findUnique.mockResolvedValue({ id: 'p1', stockCount: 8 });

      const result = await service.adjustInventory('p1', { stockCount: 0, note: 'damaged batch' });

      expect(prismaMock.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { stockCount: 0, stockStatus: 'out_of_stock' },
      });
      const txData = prismaMock.inventoryTransaction.create.mock.calls[0][0].data;
      expect(txData.type).toBe(InventoryTransactionType.ADJUSTMENT);
      expect(txData.quantity).toBe(8);
      expect(result.stockStatus).toBe('out_of_stock');
    });

    it('creates a default warehouse when none exists', async () => {
      prismaMock.product.findUnique.mockResolvedValue({ id: 'p1', stockCount: 0 });
      prismaMock.warehouse.findFirst.mockResolvedValue(null);
      prismaMock.warehouse.create.mockResolvedValue(warehouse);

      await service.adjustInventory('p1', { delta: 10 });

      expect(prismaMock.warehouse.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ code: 'MAIN' }),
      });
    });
  });

  describe('createCoupon', () => {
    it('normalizes the code to uppercase and applies defaults', async () => {
      prismaMock.coupon.findUnique.mockResolvedValue(null);
      prismaMock.coupon.create.mockImplementation(async ({ data }: any) => ({ id: 'c1', ...data }));

      await service.createCoupon({ code: 'welcome10', discountType: 'PERCENTAGE', discountValue: 10 });

      const created = prismaMock.coupon.create.mock.calls[0][0].data;
      expect(created.code).toBe('WELCOME10');
      expect(created.discountValue).toBe(10);
      expect(created.perUserLimit).toBe(1);
      expect(created.isActive).toBe(true);
    });

    it('rejects duplicate coupon codes', async () => {
      prismaMock.coupon.findUnique.mockResolvedValue({ id: 'c1', code: 'WELCOME10' });

      await expect(
        service.createCoupon({ code: 'welcome10', discountType: 'FLAT', discountValue: 100 }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.coupon.create).not.toHaveBeenCalled();
    });

    it('rejects a coupon without a discount type or value', async () => {
      await expect(service.createCoupon({ code: 'X' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateCoupon / deleteCoupon', () => {
    it('throws NotFoundException for an unknown coupon', async () => {
      prismaMock.coupon.findUnique.mockResolvedValue(null);

      await expect(service.updateCoupon('missing', { isActive: false })).rejects.toThrow(NotFoundException);
      await expect(service.deleteCoupon('missing')).rejects.toThrow(NotFoundException);
    });

    it('updates only the provided fields', async () => {
      prismaMock.coupon.findUnique.mockResolvedValue({ id: 'c1', code: 'SAVE10' });
      prismaMock.coupon.update.mockResolvedValue({});

      await service.updateCoupon('c1', { isActive: false, maxDiscount: 200 });

      expect(prismaMock.coupon.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { isActive: false, maxDiscount: 200 },
      });
    });
  });

  describe('getAnalytics', () => {
    it('buckets non-cancelled orders into daily revenue and excludes cancelled ones', async () => {
      const today = new Date();
      prismaMock.order.findMany.mockResolvedValue([
        { createdAt: today, total: 1000, status: 'DELIVERED' },
        { createdAt: today, total: 500, status: 'PENDING' },
        { createdAt: today, total: 999, status: 'CANCELLED' },
      ]);
      prismaMock.user.count.mockResolvedValue(4);
      prismaMock.order.groupBy.mockResolvedValue([{ status: 'DELIVERED', _count: 1 }]);
      prismaMock.orderItem.groupBy.mockResolvedValue([]);

      const result = await service.getAnalytics(7);

      expect(result.days).toBe(7);
      expect(result.revenueByDay).toHaveLength(7);
      expect(result.totalRevenue).toBe(1500); // cancelled order excluded
      expect(result.totalOrders).toBe(2);
      expect(result.newUsers).toBe(4);
      expect(result.aov).toBe(750);
      const todayBucket = result.revenueByDay[result.revenueByDay.length - 1];
      expect(todayBucket.revenue).toBe(1500);
    });
  });

  describe('getInventoryForAdmin', () => {
    it('aggregates reserved/available across warehouses per product', async () => {
      prismaMock.product.findMany.mockResolvedValue([
        {
          id: 'p1',
          slug: 'acrylic-photo',
          sku: 'SKU1',
          title: 'Acrylic Photo',
          image: 'img.jpg',
          stockStatus: 'in_stock',
          stockCount: 30,
          category: { name: 'Wall Photos' },
          inventory: [
            { quantity: 20, reserved: 2, available: 18, warehouse: { name: 'Main', code: 'MAIN' } },
            { quantity: 10, reserved: 1, available: 9, warehouse: { name: 'North', code: 'NORTH' } },
          ],
        },
      ]);
      prismaMock.product.count.mockResolvedValue(1);

      const result = await service.getInventoryForAdmin(1, 20);

      expect(result.data[0].reserved).toBe(3);
      expect(result.data[0].available).toBe(27);
      expect(result.data[0]).not.toHaveProperty('inventory');
      expect(result.meta.total).toBe(1);
    });
  });
});
