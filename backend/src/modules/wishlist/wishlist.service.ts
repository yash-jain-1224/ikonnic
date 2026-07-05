import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async getWishlist(userId: string) {
    let wishlist = await this.prisma.wishlist.findUnique({
      where: { userId },
      include: { items: { include: { product: true }, orderBy: { addedAt: 'desc' } } },
    });
    if (!wishlist) {
      wishlist = await this.prisma.wishlist.create({
        data: { userId },
        include: { items: { include: { product: true } } },
      });
    }
    return wishlist;
  }

  async addItem(userId: string, productId: string) {
    let wishlist = await this.prisma.wishlist.findUnique({ where: { userId } });
    if (!wishlist) {
      wishlist = await this.prisma.wishlist.create({ data: { userId } });
    }
    // Check if already exists
    const existing = await this.prisma.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    });
    if (existing) return existing;

    return this.prisma.wishlistItem.create({
      data: { wishlistId: wishlist.id, productId },
      include: { product: true },
    });
  }

  async removeItem(userId: string, productId: string) {
    const wishlist = await this.prisma.wishlist.findUnique({ where: { userId } });
    if (!wishlist) throw new NotFoundException('Wishlist not found');
    await this.prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id, productId } });
    return { message: 'Item removed from wishlist' };
  }

  async hasProduct(userId: string, productId: string): Promise<boolean> {
    const wishlist = await this.prisma.wishlist.findUnique({ where: { userId } });
    if (!wishlist) return false;
    const item = await this.prisma.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    });
    return !!item;
  }

  async clearWishlist(userId: string) {
    const wishlist = await this.prisma.wishlist.findUnique({ where: { userId } });
    if (wishlist) {
      await this.prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id } });
    }
    return { message: 'Wishlist cleared' };
  }
}
