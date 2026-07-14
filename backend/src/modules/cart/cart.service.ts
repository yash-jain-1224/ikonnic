import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId?: string, guestSessionId?: string) {
    const where: any = {};
    if (userId) where.userId = userId;
    else if (guestSessionId) where.guestSessionId = guestSessionId;
    else throw new BadRequestException('User ID or guest session required');

    let cart = await this.prisma.cart.findFirst({
      where,
      include: {
        items: {
          include: {
            product: {
              select: { id: true, slug: true, title: true, image: true, price: true, stockStatus: true, stockCount: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId, guestSessionId },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, slug: true, title: true, image: true, price: true, stockStatus: true, stockCount: true },
              },
            },
          },
        },
      });
    }

    // Calculate totals
    const subtotal = cart.items.reduce(
      (sum, item) => sum + (item.unitPrice + item.optionsPrice - item.discount) * item.quantity,
      0,
    );

    return {
      ...cart,
      subtotal,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  async addItem(userId: string | undefined, guestSessionId: string | undefined, dto: AddToCartDto) {
    // Resolve the authoritative unit price from the product — never trust the client.
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.isActive === false) throw new BadRequestException('Product is not available');

    const unitPrice = product.price;
    const optionsPrice = Math.max(0, Number(dto.optionsPrice) || 0);
    const quantity = Math.max(1, Math.floor(Number(dto.quantity) || 1));

    // Get or create cart
    let cart = await this.getOrCreateCart(userId, guestSessionId);

    // A customized album is a unique production job. Never collapse it into
    // another copy of the same product or its page/photo assignments are lost.
    const existingItem = this.hasCustomisation(dto.customisationJson)
      ? null
      : await this.prisma.cartItem.findFirst({
          where: {
            cartId: cart.id,
            productId: dto.productId,
          },
        });

    if (existingItem) {
      // Update quantity and refresh the price to the current server value
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity, unitPrice, optionsPrice },
        include: { product: true },
      });
    }

    // Add new item
    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: dto.productId,
        quantity,
        unitPrice,
        optionsPrice,
        discount: 0,
        selectedOptions: dto.selectedOptions || {},
        uploadedImagePreview: dto.uploadedImagePreview,
        uploadedImageRef: dto.uploadedImageRef,
        previewImage: dto.previewImage,
        customisationJson: dto.customisationJson,
      },
      include: { product: true },
    });
  }

  async updateItem(
    cartItemId: string,
    dto: UpdateCartItemDto,
    userId?: string,
    guestSessionId?: string,
  ) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });
    if (!item) throw new NotFoundException('Cart item not found');
    this.assertOwnership(item.cart, userId, guestSessionId);

    const updateData: any = { quantity: dto.quantity ?? item.quantity };
    if (dto.selectedOptions) updateData.selectedOptions = dto.selectedOptions;

    return this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: updateData,
      include: { product: true },
    });
  }

  async removeItem(cartItemId: string, userId?: string, guestSessionId?: string) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });
    if (!item) throw new NotFoundException('Cart item not found');
    this.assertOwnership(item.cart, userId, guestSessionId);

    await this.prisma.cartItem.delete({ where: { id: cartItemId } });
    return { message: 'Item removed from cart' };
  }

  /**
   * Ensures the caller owns the cart the item belongs to. Authenticated users
   * must match on userId; guests must present the matching guestSessionId.
   */
  private assertOwnership(
    cart: { userId: string | null; guestSessionId: string | null },
    userId?: string,
    guestSessionId?: string,
  ) {
    if (userId && cart.userId === userId) return;
    if (guestSessionId && cart.guestSessionId === guestSessionId) return;
    throw new ForbiddenException('You do not have access to this cart item');
  }

  async clearCart(userId?: string, guestSessionId?: string) {
    const cart = await this.getOrCreateCart(userId, guestSessionId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { message: 'Cart cleared' };
  }

  async mergeGuestCart(guestSessionId: string, userId: string) {
    // Find guest cart
    const guestCart = await this.prisma.cart.findFirst({
      where: { guestSessionId },
      include: { items: true },
    });

    if (!guestCart || guestCart.items.length === 0) return;

    // Get or create user cart
    let userCart = await this.prisma.cart.findFirst({ where: { userId } });
    if (!userCart) {
      userCart = await this.prisma.cart.create({ data: { userId } });
    }

    // Merge items
    for (const item of guestCart.items) {
      const existing = this.hasCustomisation(item.customisationJson)
        ? null
        : await this.prisma.cartItem.findFirst({
            where: {
              cartId: userCart.id,
              productId: item.productId,
            },
          });

      if (existing) {
        await this.prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + item.quantity },
        });
      } else {
        await this.prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            optionsPrice: item.optionsPrice,
            discount: item.discount,
            selectedOptions: item.selectedOptions as object,
            uploadedImagePreview: item.uploadedImagePreview,
            uploadedImageRef: item.uploadedImageRef,
            previewImage: item.previewImage,
            customisationJson: item.customisationJson as object ?? undefined,
          },
        });
      }
    }

    // Delete guest cart
    await this.prisma.cart.delete({ where: { id: guestCart.id } });
  }

  private async getOrCreateCart(userId?: string, guestSessionId?: string) {
    if (!userId && !guestSessionId) {
      throw new BadRequestException('User ID or guest session required');
    }

    const where: any = {};
    if (userId) where.userId = userId;
    else if (guestSessionId) where.guestSessionId = guestSessionId;

    let cart = await this.prisma.cart.findFirst({ where });
    if (!cart) {
      cart = await this.prisma.cart.create({ data: { userId, guestSessionId } });
    }
    return cart;
  }

  private hasCustomisation(value: unknown) {
    return (
      Boolean(value) &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value as object).length > 0
    );
  }
}
