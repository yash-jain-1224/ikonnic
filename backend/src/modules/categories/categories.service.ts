import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async findAll(featured?: boolean) {
    const cached = await this.redis.getJson('categories:all');
    if (cached && !featured) return cached;

    const where: any = { isActive: true };
    if (featured !== undefined) where.featured = featured;

    const categories = await this.prisma.category.findMany({
      where,
      include: { volumePricing: { include: { tiers: true } }, _count: { select: { products: true } } },
      orderBy: { sortOrder: 'asc' },
    });

    if (!featured) await this.redis.setJson('categories:all', categories, 600);
    return categories;
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        volumePricing: { include: { tiers: { orderBy: { quantity: 'asc' } } } },
        filters: true,
        children: true,
        _count: { select: { products: true } },
      },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }
}
