import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizePage, normalizeLimit } from '../../common/pagination';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async getProductReviews(productId: string, page = 1, limit = 10) {
    page = normalizePage(page);
    limit = normalizeLimit(limit, 10);
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId, isApproved: true },
        include: { user: { select: { firstName: true, lastName: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      this.prisma.review.count({ where: { productId, isApproved: true } }),
    ]);
    return { data: reviews, meta: { total, page, limit } };
  }

  async createReview(userId: string, productId: string, data: { rating: number; title?: string; text: string; photos?: string[] }) {
    // Check if user has ordered this product
    const hasOrdered = await this.prisma.orderItem.findFirst({
      where: { productId, order: { userId, status: 'DELIVERED' } },
    });

    return this.prisma.review.create({
      data: {
        userId, productId,
        rating: data.rating, title: data.title, text: data.text,
        photos: data.photos || [],
        isVerified: !!hasOrdered,
      },
    });
  }

  async updateReview(reviewId: string, userId: string, data: { rating?: number; text?: string }) {
    const review = await this.prisma.review.findFirst({ where: { id: reviewId, userId } });
    if (!review) throw new NotFoundException('Review not found');
    return this.prisma.review.update({ where: { id: reviewId }, data });
  }

  async deleteReview(reviewId: string, userId: string) {
    const review = await this.prisma.review.findFirst({ where: { id: reviewId, userId } });
    if (!review) throw new NotFoundException('Review not found');
    await this.prisma.review.delete({ where: { id: reviewId } });
    return { message: 'Review deleted' };
  }
}
