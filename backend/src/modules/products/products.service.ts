import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { ProductQueryDto } from './dto/product-query.dto';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async findAll(query: ProductQueryDto) {
    const {
      page = 1,
      limit = 20,
      categorySlug,
      search,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      filterTags,
      sale,
      featured,
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { isActive: true };

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { filterTags: { hasSome: [search] } },
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (filterTags && filterTags.length > 0) {
      where.filterTags = { hasSome: filterTags };
    }

    if (sale !== undefined) where.sale = sale;
    if (featured !== undefined) where.isFeatured = featured;

    // Execute query
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { slug: true, name: true } },
          sizeOptions: { orderBy: { sortOrder: 'asc' } },
          thicknessOptions: { orderBy: { sortOrder: 'asc' } },
          reviews: {
            where: { isApproved: true },
            select: { rating: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    // Compute average ratings
    const productsWithRating = products.map((product) => {
      const ratings = product.reviews.map((r) => r.rating);
      const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
      const { reviews, ...rest } = product;
      return { ...rest, avgRating, reviewsCount: ratings.length };
    });

    return {
      data: productsWithRating,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async findBySlug(slug: string) {
    // Check cache first
    const cached = await this.redis.getJson(`product:${slug}`);
    if (cached) return cached;

    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        sizeOptions: { orderBy: { sortOrder: 'asc' } },
        thicknessOptions: { orderBy: { sortOrder: 'asc' } },
        colorOptions: { orderBy: { sortOrder: 'asc' } },
        variants: { where: { isActive: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        reviews: {
          where: { isApproved: true },
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Compute stats
    const allReviews = await this.prisma.review.findMany({
      where: { productId: product.id, isApproved: true },
      select: { rating: true },
    });

    const avgRating = allReviews.length > 0
      ? allReviews.reduce((a, b) => a + b.rating, 0) / allReviews.length
      : 0;

    const result = {
      ...product,
      avgRating: Math.round(avgRating * 10) / 10,
      totalReviews: allReviews.length,
      ratingDistribution: {
        5: allReviews.filter((r) => r.rating === 5).length,
        4: allReviews.filter((r) => r.rating === 4).length,
        3: allReviews.filter((r) => r.rating === 3).length,
        2: allReviews.filter((r) => r.rating === 2).length,
        1: allReviews.filter((r) => r.rating === 1).length,
      },
    };

    // Cache for 5 minutes
    await this.redis.setJson(`product:${slug}`, result, 300);

    return result;
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async getRelatedProducts(slug: string, limit = 8) {
    const product = await this.prisma.product.findUnique({ where: { slug } });
    if (!product) return [];

    return this.prisma.product.findMany({
      where: {
        isActive: true,
        categoryId: product.categoryId,
        id: { not: product.id },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFeaturedProducts(limit = 12) {
    const cached = await this.redis.getJson('products:featured');
    if (cached) return cached;

    const products = await this.prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      include: { category: { select: { slug: true, name: true } } },
      take: limit,
      orderBy: { sortOrder: 'asc' },
    });

    await this.redis.setJson('products:featured', products, 600);
    return products;
  }

  async getTrendingProducts(limit = 10) {
    // Based on recent order count
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: { select: { slug: true, name: true } },
        _count: { select: { orderItems: true } },
      },
      orderBy: { orderItems: { _count: 'desc' } },
      take: limit,
    });

    return products;
  }

  async checkStock(productId: string, quantity: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { stockCount: true, stockStatus: true },
    });

    if (!product) throw new NotFoundException('Product not found');

    const available = product.stockCount ?? Infinity;
    return {
      available: available >= quantity,
      stockCount: product.stockCount,
      stockStatus: product.stockStatus,
    };
  }
}
