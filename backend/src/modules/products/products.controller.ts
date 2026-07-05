import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ProductQueryDto } from './dto/product-query.dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products with filtering, sorting, and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated product list' })
  async findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured products' })
  async getFeatured(@Query('limit') limit?: number) {
    return this.productsService.getFeaturedProducts(limit);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending products based on order count' })
  async getTrending(@Query('limit') limit?: number) {
    return this.productsService.getTrendingProducts(limit);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get product by slug with full details' })
  @ApiResponse({ status: 200, description: 'Product details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get(':slug/related')
  @ApiOperation({ summary: 'Get related products' })
  async getRelated(@Param('slug') slug: string, @Query('limit') limit?: number) {
    return this.productsService.getRelatedProducts(slug, limit);
  }

  @Get(':id/stock')
  @ApiOperation({ summary: 'Check product stock availability' })
  async checkStock(@Param('id') id: string, @Query('quantity') quantity: number = 1) {
    return this.productsService.checkStock(id, quantity);
  }
}
