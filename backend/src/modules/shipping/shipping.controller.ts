import { Controller, Get, Post, Param, Body, UseGuards, Headers, RawBodyRequest, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShippingService } from './shipping.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('shipping')
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get('check/:pincode')
  @ApiOperation({ summary: 'Check delivery serviceability for a pincode' })
  async checkServiceability(@Param('pincode') pincode: string) {
    return this.shippingService.checkServiceability(pincode);
  }

  @Get('track/:trackingNumber')
  @ApiOperation({ summary: 'Get shipment tracking info' })
  async track(@Param('trackingNumber') trackingNumber: string) {
    return this.shippingService.getTrackingInfo(trackingNumber);
  }

  @Post('create-shipment/:orderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create shipment via Shiprocket (admin)' })
  async createShipment(@Param('orderId') orderId: string) {
    return this.shippingService.createShipment(orderId);
  }

  @Post('cancel/:shipmentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a shipment (admin)' })
  async cancelShipment(@Param('shipmentId') shipmentId: string) {
    return this.shippingService.cancelShipment(shipmentId);
  }

  @Post('webhook/shiprocket')
  @ApiOperation({ summary: 'Shiprocket webhook for tracking updates' })
  async shiprocketWebhook(@Body() payload: any) {
    await this.shippingService.handleShiprocketWebhook(payload);
    return { status: 'ok' };
  }
}
