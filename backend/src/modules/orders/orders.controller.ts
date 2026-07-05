import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderBodyDto } from '../../modules/payments/dto/payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new order' })
  async create(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user order history' })
  async findAll(@Req() req: any, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.ordersService.findUserOrders(req.user.id, page, limit);
  }

  @Get('track/:orderNumber')
  @ApiOperation({ summary: 'Track order by order number (public)' })
  async track(
    @Param('orderNumber') orderNumber: string,
    @Query('identifier') identifier?: string,
  ) {
    return this.ordersService.trackOrder(orderNumber, identifier);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order details' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.findById(id, req.user.id);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel an order' })
  async cancel(@Param('id') id: string, @Req() req: any, @Body() body: CancelOrderBodyDto) {
    return this.ordersService.cancelOrder(id, req.user.id, body.reason);
  }
}
