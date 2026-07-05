import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CouponsService', () => {
  let service: CouponsService;

  const prismaMock = {
    coupon: { findUnique: jest.fn(), update: jest.fn() },
    couponUsage: { count: jest.fn(), create: jest.fn() },
  };

  const baseCoupon = {
    id: 'c1',
    code: 'SAVE10',
    description: '10% off',
    isActive: true,
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
    usageLimit: null,
    usedCount: 0,
    minOrderAmount: null,
    perUserLimit: 1,
    discountType: 'PERCENTAGE',
    discountValue: 10,
    maxDiscount: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [CouponsService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = moduleRef.get(CouponsService);
  });

  describe('validateCoupon', () => {
    it('throws for an unknown code', async () => {
      prismaMock.coupon.findUnique.mockResolvedValue(null);

      await expect(service.validateCoupon('NOPE', 1000)).rejects.toThrow(BadRequestException);
    });

    it('normalizes the code to uppercase before lookup', async () => {
      prismaMock.coupon.findUnique.mockResolvedValue({ ...baseCoupon });

      await service.validateCoupon('save10', 1000);

      expect(prismaMock.coupon.findUnique).toHaveBeenCalledWith({ where: { code: 'SAVE10' } });
    });

    it('throws for an inactive coupon', async () => {
      prismaMock.coupon.findUnique.mockResolvedValue({ ...baseCoupon, isActive: false });

      await expect(service.validateCoupon('SAVE10', 1000)).rejects.toThrow('Coupon is no longer active');
    });

    it('throws for an expired coupon', async () => {
      prismaMock.coupon.findUnique.mockResolvedValue({
        ...baseCoupon,
        validUntil: new Date(Date.now() - 1000),
      });

      await expect(service.validateCoupon('SAVE10', 1000)).rejects.toThrow('Coupon has expired');
    });

    it('throws when the usage limit is reached', async () => {
      prismaMock.coupon.findUnique.mockResolvedValue({
        ...baseCoupon,
        usageLimit: 100,
        usedCount: 100,
      });

      await expect(service.validateCoupon('SAVE10', 1000)).rejects.toThrow('usage limit');
    });

    it('throws when the cart total is below the minimum order amount', async () => {
      prismaMock.coupon.findUnique.mockResolvedValue({ ...baseCoupon, minOrderAmount: 500 });

      await expect(service.validateCoupon('SAVE10', 499)).rejects.toThrow('Minimum order');
    });

    it('throws when the per-user limit is exhausted', async () => {
      prismaMock.coupon.findUnique.mockResolvedValue({ ...baseCoupon, perUserLimit: 1 });
      prismaMock.couponUsage.count.mockResolvedValue(1);

      await expect(service.validateCoupon('SAVE10', 1000, 'u1')).rejects.toThrow(
        'already used this coupon',
      );
    });

    it('calculates a percentage discount', async () => {
      prismaMock.coupon.findUnique.mockResolvedValue({ ...baseCoupon });

      const result = await service.validateCoupon('SAVE10', 2000);

      expect(result.calculatedDiscount).toBe(200);
      expect(result.discountType).toBe('PERCENTAGE');
    });

    it('caps a percentage discount at maxDiscount', async () => {
      prismaMock.coupon.findUnique.mockResolvedValue({ ...baseCoupon, maxDiscount: 150 });

      const result = await service.validateCoupon('SAVE10', 5000);

      expect(result.calculatedDiscount).toBe(150);
    });

    it('returns the flat discount value for FLAT coupons', async () => {
      prismaMock.coupon.findUnique.mockResolvedValue({
        ...baseCoupon,
        discountType: 'FLAT',
        discountValue: 250,
      });

      const result = await service.validateCoupon('SAVE10', 2000);

      expect(result.calculatedDiscount).toBe(250);
    });
  });

  describe('applyCoupon', () => {
    it('records usage and increments the used count', async () => {
      prismaMock.coupon.findUnique.mockResolvedValue({ ...baseCoupon });
      prismaMock.couponUsage.create.mockResolvedValue({});
      prismaMock.coupon.update.mockResolvedValue({});

      await service.applyCoupon('SAVE10', 'u1', 'o1');

      expect(prismaMock.couponUsage.create).toHaveBeenCalledWith({
        data: { couponId: 'c1', userId: 'u1', orderId: 'o1' },
      });
      expect(prismaMock.coupon.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { usedCount: { increment: 1 } },
      });
    });
  });
});
