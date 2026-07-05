import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async search(query: string, limit = 20) {
    if (!query || query.length < 2) return { products: [], categories: [] };

    const takeLimit = Number(limit) || 20;

    const [products, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { filterTags: { hasSome: [query] } },
            { sku: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: { id: true, slug: true, title: true, image: true, price: true, oldPrice: true, category: { select: { slug: true } } },
        take: takeLimit,
      }),
      this.prisma.category.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { slug: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: { slug: true, name: true, image: true },
        take: 5,
      }),
    ]);

    return { products, categories, total: products.length };
  }

  async autocomplete(query: string) {
    if (!query || query.length < 2) return [];

    // Check cache
    const cacheKey = `search:ac:${query.toLowerCase()}`;
    const cached = await this.redis.getJson<string[]>(cacheKey);
    if (cached) return cached;

    const products = await this.prisma.product.findMany({
      where: { isActive: true, title: { contains: query, mode: 'insensitive' } },
      select: { title: true, slug: true },
      take: 8,
    });

    const suggestions = products.map((p) => ({ title: p.title, slug: p.slug }));
    await this.redis.setJson(cacheKey, suggestions, 300);
    return suggestions;
  }
}
