import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async validateCoupon(code: string, cartTotal: number, userId?: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

    if (!coupon) throw new BadRequestException('Invalid coupon code');
    if (!coupon.isActive) throw new BadRequestException('Coupon is no longer active');
    if (coupon.validUntil && coupon.validUntil < new Date()) throw new BadRequestException('Coupon has expired');
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new BadRequestException('Coupon usage limit reached');
    if (coupon.minOrderAmount && cartTotal < coupon.minOrderAmount) {
      throw new BadRequestException(`Minimum order of ₹${coupon.minOrderAmount} required`);
    }

    // Check per-user limit
    if (userId) {
      const userUsage = await this.prisma.couponUsage.count({
        where: { couponId: coupon.id, userId },
      });
      if (userUsage >= coupon.perUserLimit) throw new BadRequestException('You have already used this coupon');
    }

    // Calculate discount
    const discount = coupon.discountType === 'PERCENTAGE'
      ? Math.min(Math.round(cartTotal * coupon.discountValue / 100), coupon.maxDiscount || Infinity)
      : coupon.discountValue;

    return {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      calculatedDiscount: discount,
      description: coupon.description,
    };
  }

  async applyCoupon(code: string, userId: string, orderId?: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon) throw new BadRequestException('Invalid coupon');

    await this.prisma.couponUsage.create({
      data: { couponId: coupon.id, userId, orderId },
    });

    await this.prisma.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } },
    });

    return { message: 'Coupon applied successfully' };
  }
}
