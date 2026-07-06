import { Controller, Get, Post, Put, Delete, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateCouponDto,
  UpdateCouponDto,
  UpdateOrderStatusDto,
  AdjustInventoryDto,
  UpdateOrderNotesDto,
  UpdateUserStatusDto,
  ModerateReviewDto,
} from './dto/admin.dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard metrics' })
  async dashboard() {
    return this.adminService.getDashboardMetrics();
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get all orders (admin)' })
  async orders(@Query('page') page?: number, @Query('limit') limit?: number, @Query('status') status?: string) {
    return this.adminService.getOrdersForAdmin(page, limit, status);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users (admin)' })
  async users(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.getUsersForAdmin(page, limit);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get customer detail with order history (admin)' })
  async getUser(@Param('id') id: string) {
    return this.adminService.getUserByIdForAdmin(id);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Activate / deactivate a customer account (admin)' })
  async setUserStatus(@Param('id') id: string, @Body() body: UpdateUserStatusDto, @Req() req?: any) {
    return this.adminService.setUserActive(id, body.isActive, req?.user?.id);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get full order detail (admin)' })
  async getOrder(@Param('id') id: string) {
    return this.adminService.getOrderByIdForAdmin(id);
  }

  @Patch('orders/:id/status')
  @ApiOperation({ summary: 'Update order status (admin)' })
  async updateOrderStatus(@Param('id') id: string, @Body() body: UpdateOrderStatusDto, @Req() req?: any) {
    return this.adminService.updateOrderStatus(id, body.status, body.note, req?.user?.id);
  }

  @Patch('orders/:id/notes')
  @ApiOperation({ summary: 'Update internal order notes (admin)' })
  async updateOrderNotes(@Param('id') id: string, @Body() body: UpdateOrderNotesDto) {
    return this.adminService.updateOrderNotes(id, body.internalNotes);
  }

  // ─── Product CRUD ──────────────────────────────────────────
  @Get('products')
  @ApiOperation({ summary: 'List all products with search and pagination (admin)' })
  async getProducts(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.adminService.getProductsForAdmin(page, limit, search);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get product details (admin)' })
  async getProduct(@Param('id') id: string) {
    return this.adminService.getProductById(id);
  }

  @Post('products')
  @ApiOperation({ summary: 'Create product (admin)' })
  async createProduct(@Body() body: CreateProductDto) {
    return this.adminService.createProduct(body);
  }

  @Put('products/:id')
  @ApiOperation({ summary: 'Update product (admin)' })
  async updateProduct(@Param('id') id: string, @Body() body: UpdateProductDto) {
    return this.adminService.updateProduct(id, body);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Delete product (admin)' })
  async deleteProduct(@Param('id') id: string) {
    return this.adminService.deleteProduct(id);
  }

  // ─── Category CRUD ─────────────────────────────────────────
  @Get('categories')
  @ApiOperation({ summary: 'List all categories (admin)' })
  async getCategories() {
    return this.adminService.getCategoriesForAdmin();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create category (admin)' })
  async createCategory(@Body() body: CreateCategoryDto) {
    return this.adminService.createCategory(body);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Update category (admin)' })
  async updateCategory(@Param('id') id: string, @Body() body: UpdateCategoryDto) {
    return this.adminService.updateCategory(id, body);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete category (admin)' })
  async deleteCategory(@Param('id') id: string) {
    return this.adminService.deleteCategory(id);
  }

  // ─── Inventory Management ──────────────────────────────────
  @Get('inventory')
  @ApiOperation({ summary: 'List product inventory with stock levels (admin)' })
  async getInventory(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('lowStock') lowStock?: string,
  ) {
    return this.adminService.getInventoryForAdmin(page, limit, search, lowStock === 'true');
  }

  @Patch('inventory/:productId')
  @ApiOperation({ summary: 'Adjust stock for a product (admin)' })
  async adjustInventory(
    @Param('productId') productId: string,
    @Body() body: AdjustInventoryDto,
    @Req() req?: any,
  ) {
    return this.adminService.adjustInventory(productId, body, req?.user?.id);
  }

  @Get('inventory/:productId/transactions')
  @ApiOperation({ summary: 'Get inventory transaction history for a product (admin)' })
  async getInventoryTransactions(@Param('productId') productId: string, @Query('limit') limit?: number) {
    return this.adminService.getInventoryTransactions(productId, limit);
  }

  // ─── Coupon CRUD ───────────────────────────────────────────
  @Get('coupons')
  @ApiOperation({ summary: 'List all coupons with usage counts (admin)' })
  async getCoupons() {
    return this.adminService.getCouponsForAdmin();
  }

  @Post('coupons')
  @ApiOperation({ summary: 'Create coupon (admin)' })
  async createCoupon(@Body() body: CreateCouponDto) {
    return this.adminService.createCoupon(body);
  }

  @Put('coupons/:id')
  @ApiOperation({ summary: 'Update coupon (admin)' })
  async updateCoupon(@Param('id') id: string, @Body() body: UpdateCouponDto) {
    return this.adminService.updateCoupon(id, body);
  }

  @Delete('coupons/:id')
  @ApiOperation({ summary: 'Delete coupon (admin)' })
  async deleteCoupon(@Param('id') id: string) {
    return this.adminService.deleteCoupon(id);
  }

  // ─── Reviews Moderation ────────────────────────────────────
  @Get('reviews')
  @ApiOperation({ summary: 'List reviews for moderation (admin)' })
  async getReviews(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: 'approved' | 'pending',
  ) {
    return this.adminService.getReviewsForAdmin(page, limit, status);
  }

  @Patch('reviews/:id')
  @ApiOperation({ summary: 'Approve/hide a review or add an admin reply (admin)' })
  async moderateReview(@Param('id') id: string, @Body() body: ModerateReviewDto) {
    return this.adminService.moderateReview(id, body);
  }

  @Delete('reviews/:id')
  @ApiOperation({ summary: 'Delete a review (admin)' })
  async deleteReview(@Param('id') id: string) {
    return this.adminService.deleteReviewAsAdmin(id);
  }

  // ─── Analytics ─────────────────────────────────────────────
  @Get('analytics')
  @ApiOperation({ summary: 'Get sales analytics: revenue by day, orders by status, top products (admin)' })
  async analytics(@Query('days') days?: number) {
    return this.adminService.getAnalytics(days);
  }
}
