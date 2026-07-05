import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryTransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardMetrics() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalOrders, totalRevenue, totalUsers, recentOrders, ordersByStatus, topProducts] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.aggregate({ _sum: { total: true }, where: { status: { not: 'CANCELLED' } } }),
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.order.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.order.groupBy({ by: ['status'], _count: true }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      totalOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      totalUsers,
      recentOrders,
      ordersByStatus,
      topProducts,
      aov: totalOrders > 0 ? (totalRevenue._sum.total || 0) / totalOrders : 0,
    };
  }

  async getOrdersForAdmin(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          items: { select: { title: true, quantity: true, total: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data: orders, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getUsersForAdmin(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, isVerified: true, createdAt: true, _count: { select: { orders: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      this.prisma.user.count(),
    ]);
    return { data: users, meta: { total, page, limit } };
  }

  async updateOrderStatus(orderId: string, status: string, note?: string, adminId?: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status: status as any } });
      await tx.orderStatusHistory.create({ data: { orderId, status: status as any, note, changedBy: adminId } });
      return { message: 'Order status updated' };
    });
  }

  // ─── Product CRUD ──────────────────────────────────────────

  async getProductsForAdmin(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products: products.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        categoryName: p.category?.name,
        categorySlug: p.category?.slug,
        price: p.price,
        oldPrice: p.oldPrice,
        image: p.image,
        stockStatus: p.stockStatus,
        stockCount: p.stockCount,
        sale: p.sale,
        featured: p.isFeatured,
        createdAt: p.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: { select: { name: true, slug: true } } },
    });
    if (!product) throw new NotFoundException('Product not found');
    return {
      ...product,
      categorySlug: product.category?.slug,
      featured: product.isFeatured,
    };
  }

  async createProduct(data: any) {
    const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Resolve categoryId from categorySlug if needed
    let categoryId = data.categoryId;
    if (!categoryId && data.categorySlug) {
      const cat = await this.prisma.category.findUnique({ where: { slug: data.categorySlug } });
      if (cat) categoryId = cat.id;
    }

    return this.prisma.product.create({
      data: {
        title: data.title,
        slug,
        description: data.description || '',
        longDescription: data.longDescription,
        price: parseFloat(data.price),
        oldPrice: data.oldPrice ? parseFloat(data.oldPrice) : null,
        image: data.image || '',
        gallery: data.gallery || [],
        filterTags: data.filterTags || [],
        stockStatus: data.stockStatus || 'in_stock',
        stockCount: data.stockCount ?? null,
        sale: data.sale || false,
        isFeatured: data.featured || false,
        categoryId,
      },
    });
  }

  async updateProduct(id: string, data: any) {
    const exists = await this.prisma.product.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Product not found');

    // Resolve categoryId from categorySlug if provided
    let categoryId: string | undefined;
    if (data.categorySlug) {
      const cat = await this.prisma.category.findUnique({ where: { slug: data.categorySlug } });
      if (cat) categoryId = cat.id;
    } else if (data.categoryId) {
      categoryId = data.categoryId;
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.longDescription !== undefined && { longDescription: data.longDescription }),
        ...(data.price !== undefined && { price: parseFloat(data.price) }),
        ...(data.oldPrice !== undefined && { oldPrice: data.oldPrice ? parseFloat(data.oldPrice) : null }),
        ...(data.image !== undefined && { image: data.image }),
        ...(data.gallery !== undefined && { gallery: data.gallery }),
        ...(data.filterTags !== undefined && { filterTags: data.filterTags }),
        ...(data.stockStatus !== undefined && { stockStatus: data.stockStatus }),
        ...(data.stockCount !== undefined && { stockCount: data.stockCount }),
        ...(data.sale !== undefined && { sale: data.sale }),
        ...(data.featured !== undefined && { isFeatured: data.featured }),
        ...(categoryId && { categoryId }),
      },
    });
  }

  async deleteProduct(id: string) {
    const exists = await this.prisma.product.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Product not found');
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted successfully' };
  }

  // ─── Category CRUD ─────────────────────────────────────────

  async getCategoriesForAdmin() {
    return this.prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(data: any) {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return this.prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description || '',
        image: data.image || '',
        accent: data.accent || '#e11d48',
        featured: data.featured ?? false,
      },
    });
  }

  async updateCategory(id: string, data: any) {
    const exists = await this.prisma.category.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Category not found');
    return this.prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.image !== undefined && { image: data.image }),
        ...(data.accent !== undefined && { accent: data.accent }),
        ...(data.featured !== undefined && { featured: data.featured }),
      },
    });
  }

  async deleteCategory(id: string) {
    const exists = await this.prisma.category.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Category not found');
    // Check for products in this category
    const productCount = await this.prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      throw new NotFoundException(`Cannot delete: ${productCount} products are in this category`);
    }
    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted successfully' };
  }

  // ─── Inventory Management ──────────────────────────────────

  async getInventoryForAdmin(page = 1, limit = 20, search?: string, lowStockOnly = false) {
    const skip = (page - 1) * limit;
    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (lowStockOnly) {
      where.OR = [
        { stockStatus: { in: ['low_stock', 'out_of_stock'] } },
        { stockCount: { lte: 10 } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: {
          id: true,
          slug: true,
          sku: true,
          title: true,
          image: true,
          stockStatus: true,
          stockCount: true,
          category: { select: { name: true } },
          inventory: {
            select: { quantity: true, reserved: true, available: true, warehouse: { select: { name: true, code: true } } },
          },
        },
        orderBy: { title: 'asc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.product.count({ where }),
    ]);

    const data = products.map((product) => {
      const reserved = product.inventory.reduce((sum, r) => sum + r.reserved, 0);
      const available = product.inventory.reduce((sum, r) => sum + r.available, 0);
      const { inventory, ...rest } = product;
      return { ...rest, reserved, available };
    });

    return {
      data,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
    };
  }

  async adjustInventory(
    productId: string,
    adjustment: { stockCount?: number; delta?: number; note?: string },
    adminId?: string,
  ) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const current = product.stockCount ?? 0;
    const newCount =
      adjustment.stockCount !== undefined ? Number(adjustment.stockCount) : current + Number(adjustment.delta ?? 0);

    if (!Number.isFinite(newCount)) throw new BadRequestException('Provide stockCount or delta');
    if (newCount < 0) throw new BadRequestException('Stock cannot be negative');

    const change = newCount - current;
    const transactionType: InventoryTransactionType =
      adjustment.stockCount !== undefined
        ? InventoryTransactionType.ADJUSTMENT
        : change >= 0
          ? InventoryTransactionType.STOCK_IN
          : InventoryTransactionType.STOCK_OUT;

    // Ensure a default warehouse exists for the inventory record
    let warehouse = await this.prisma.warehouse.findFirst({ where: { isActive: true } });
    if (!warehouse) {
      warehouse = await this.prisma.warehouse.create({
        data: { name: 'Main Warehouse', code: 'MAIN', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
      });
    }

    const stockStatus = newCount === 0 ? 'out_of_stock' : newCount <= 10 ? 'low_stock' : 'in_stock';

    const [updatedProduct] = await this.prisma.$transaction([
      this.prisma.product.update({
        where: { id: productId },
        data: { stockCount: newCount, stockStatus },
      }),
      this.prisma.inventoryRecord.upsert({
        where: { productId_warehouseId: { productId, warehouseId: warehouse.id } },
        create: { productId, warehouseId: warehouse.id, quantity: newCount, reserved: 0, available: newCount },
        update: { quantity: newCount, available: { increment: change } },
      }),
      this.prisma.inventoryTransaction.create({
        data: {
          productId,
          warehouseId: warehouse.id,
          type: transactionType,
          quantity: Math.abs(change),
          note: adjustment.note,
          referenceId: adminId,
        },
      }),
    ]);

    return { product: updatedProduct, change, stockStatus };
  }

  async getInventoryTransactions(productId: string, limit = 20) {
    return this.prisma.inventoryTransaction.findMany({
      where: { productId },
      include: { warehouse: { select: { name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    });
  }

  // ─── Coupon CRUD ───────────────────────────────────────────

  async getCouponsForAdmin() {
    return this.prisma.coupon.findMany({
      include: { _count: { select: { usages: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCoupon(data: any) {
    const code = String(data.code || '').toUpperCase().trim();
    if (!code) throw new BadRequestException('Coupon code is required');
    if (!data.discountType || data.discountValue == null) {
      throw new BadRequestException('Discount type and value are required');
    }

    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) throw new BadRequestException('Coupon code already exists');

    return this.prisma.coupon.create({
      data: {
        code,
        description: data.description || null,
        discountType: data.discountType,
        discountValue: Number(data.discountValue),
        minOrderAmount: data.minOrderAmount != null && data.minOrderAmount !== '' ? Number(data.minOrderAmount) : null,
        maxDiscount: data.maxDiscount != null && data.maxDiscount !== '' ? Number(data.maxDiscount) : null,
        validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        usageLimit: data.usageLimit != null && data.usageLimit !== '' ? Number(data.usageLimit) : null,
        perUserLimit: data.perUserLimit != null && data.perUserLimit !== '' ? Number(data.perUserLimit) : 1,
        isActive: data.isActive ?? true,
        applicableCategories: data.applicableCategories ?? [],
      },
    });
  }

  async updateCoupon(id: string, data: any) {
    const exists = await this.prisma.coupon.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Coupon not found');

    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.discountType !== undefined && { discountType: data.discountType }),
        ...(data.discountValue !== undefined && { discountValue: Number(data.discountValue) }),
        ...(data.minOrderAmount !== undefined && {
          minOrderAmount: data.minOrderAmount !== null && data.minOrderAmount !== '' ? Number(data.minOrderAmount) : null,
        }),
        ...(data.maxDiscount !== undefined && {
          maxDiscount: data.maxDiscount !== null && data.maxDiscount !== '' ? Number(data.maxDiscount) : null,
        }),
        ...(data.validUntil !== undefined && { validUntil: data.validUntil ? new Date(data.validUntil) : null }),
        ...(data.usageLimit !== undefined && {
          usageLimit: data.usageLimit !== null && data.usageLimit !== '' ? Number(data.usageLimit) : null,
        }),
        ...(data.perUserLimit !== undefined && { perUserLimit: Number(data.perUserLimit) }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.applicableCategories !== undefined && { applicableCategories: data.applicableCategories }),
      },
    });
  }

  async deleteCoupon(id: string) {
    const exists = await this.prisma.coupon.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Coupon not found');
    await this.prisma.coupon.delete({ where: { id } });
    return { message: 'Coupon deleted successfully' };
  }

  // ─── Analytics ─────────────────────────────────────────────

  async getAnalytics(days = 30) {
    const rangeDays = Math.min(Math.max(Number(days) || 30, 1), 365);
    // Work in UTC so day buckets line up with toISOString() date keys
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (rangeDays - 1));

    const [orders, newUsers, ordersByStatus, topProductsRaw] = await Promise.all([
      this.prisma.order.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, total: true, status: true },
      }),
      this.prisma.user.count({ where: { createdAt: { gte: since }, role: 'CUSTOMER' } }),
      this.prisma.order.groupBy({ by: ['status'], _count: true }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 8,
      }),
    ]);

    // Bucket revenue and order counts per day (cancelled orders excluded)
    const byDay = new Map<string, { revenue: number; orders: number }>();
    for (let i = 0; i < rangeDays; i++) {
      const d = new Date(since);
      d.setUTCDate(d.getUTCDate() + i);
      byDay.set(d.toISOString().slice(0, 10), { revenue: 0, orders: 0 });
    }
    for (const order of orders) {
      if (order.status === 'CANCELLED') continue;
      const bucket = byDay.get(order.createdAt.toISOString().slice(0, 10));
      if (bucket) {
        bucket.revenue += order.total;
        bucket.orders += 1;
      }
    }
    const revenueByDay = [...byDay.entries()].map(([date, v]) => ({ date, ...v }));

    // Resolve product titles for the top sellers
    const productIds = topProductsRaw.map((p) => p.productId);
    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, title: true, image: true, slug: true },
        })
      : [];
    const productMap = new Map(products.map((p) => [p.id, p]));
    const topProducts = topProductsRaw.map((p) => ({
      productId: p.productId,
      title: productMap.get(p.productId)?.title ?? 'Unknown product',
      image: productMap.get(p.productId)?.image,
      slug: productMap.get(p.productId)?.slug,
      quantity: p._sum.quantity ?? 0,
      revenue: p._sum.total ?? 0,
    }));

    const totalRevenue = revenueByDay.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = revenueByDay.reduce((sum, d) => sum + d.orders, 0);

    return {
      days: rangeDays,
      since: since.toISOString(),
      totalRevenue,
      totalOrders,
      newUsers,
      aov: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      revenueByDay,
      ordersByStatus,
      topProducts,
    };
  }
}
