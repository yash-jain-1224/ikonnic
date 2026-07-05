import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get current cart (authenticated or guest)' })
  async getCart(
    @Query('guestSessionId') guestSessionId?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id;
    return this.cartService.getCart(userId, guestSessionId);
  }

  @Post('items')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Add item to cart' })
  async addItem(
    @Body() dto: AddToCartDto,
    @Query('guestSessionId') guestSessionId?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id;
    return this.cartService.addItem(userId, guestSessionId, dto);
  }

  @Put('items/:id')
  @ApiOperation({ summary: 'Update cart item quantity or options' })
  async updateItem(@Param('id') id: string, @Body() dto: UpdateCartItemDto) {
    return this.cartService.updateItem(id, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeItem(@Param('id') id: string) {
    return this.cartService.removeItem(id);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear entire cart' })
  async clearCart(
    @Query('guestSessionId') guestSessionId?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id;
    return this.cartService.clearCart(userId, guestSessionId);
  }

  @Post('merge')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Merge guest cart into authenticated user cart' })
  async mergeCart(@Body() body: MergeCartDto, @Req() req: any) {
    return this.cartService.mergeGuestCart(body.guestSessionId, req.user.id);
  }
}
