import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private readonly shiprocketBase = 'https://apiv2.shiprocket.in/v1/external';

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private redis: RedisService,
  ) {}

  // ─── Shiprocket Auth ─────────────────────────────────

  private async getShiprocketToken(): Promise<string> {
    // Check Redis cache first (token valid for 10 days)
    const cached = await this.redis.get('shiprocket:token');
    if (cached) return cached;

    const email = this.configService.get('SHIPROCKET_EMAIL');
    const password = this.configService.get('SHIPROCKET_PASSWORD');

    if (!email || !password) {
      this.logger.warn('Shiprocket credentials not configured');
      throw new BadRequestException('Shipping service not configured');
    }

    const response = await fetch(`${this.shiprocketBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new BadRequestException('Failed to authenticate with Shiprocket');
    }

    const data = await response.json();
    const token = data.token;

    // Cache for 9 days (Shiprocket tokens last 10 days)
    await this.redis.set('shiprocket:token', token, 9 * 24 * 60 * 60);

    return token;
  }

  private async shiprocketRequest(endpoint: string, method = 'GET', body?: any): Promise<any> {
    const token = await this.getShiprocketToken();

    const response = await fetch(`${this.shiprocketBase}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Shiprocket API error: ${response.status} - ${errorText}`);
      throw new BadRequestException(`Shipping API error: ${response.statusText}`);
    }

    return response.json();
  }

  // ─── Serviceability ──────────────────────────────────

  async checkServiceability(pincode: string) {
    // Check local DB first for cached pincode data
    const record = await this.prisma.pincodeServiceability.findUnique({ where: { pincode } });
    if (record) {
      return {
        serviceable: record.isServiceable,
        city: record.city,
        state: record.state,
        estimatedDays: record.deliveryDays,
        codAvailable: record.codAvailable,
        expressAvailable: record.expressAvailable,
      };
    }

    // Fallback: check Shiprocket serviceability API
    try {
      const data = await this.shiprocketRequest(
        `/courier/serviceability/?pickup_postcode=302034&delivery_postcode=${pincode}&weight=0.5&cod=1`,
      );

      const serviceable = data?.data?.available_courier_companies?.length > 0;
      const cheapest = data?.data?.available_courier_companies?.[0];

      return {
        serviceable,
        city: cheapest?.city || '',
        state: cheapest?.state || '',
        estimatedDays: cheapest?.estimated_delivery_days || 7,
        codAvailable: cheapest?.cod === 1,
        expressAvailable: (cheapest?.estimated_delivery_days || 99) <= 3,
        couriers: (data?.data?.available_courier_companies || []).map((c: any) => ({
          name: c.courier_name,
          rate: c.rate,
          estimatedDays: c.estimated_delivery_days,
          cod: c.cod === 1,
        })),
      };
    } catch (error) {
      this.logger.warn(`Shiprocket serviceability check failed for ${pincode}`);
      return { serviceable: false, message: 'Unable to check serviceability at this time' };
    }
  }

  // ─── Create Shipment ─────────────────────────────────

  async createShipment(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        shippingAddress: true,
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      },
    });

    if (!order || !order.shippingAddress) {
      throw new BadRequestException('Order or shipping address not found');
    }

    const addr = order.shippingAddress;

    // Create Shiprocket order
    const shiprocketPayload = {
      order_id: order.orderNumber,
      order_date: order.createdAt.toISOString().split('T')[0],
      pickup_location: 'Primary',
      billing_customer_name: addr.fullName.split(' ')[0],
      billing_last_name: addr.fullName.split(' ').slice(1).join(' ') || '',
      billing_address: addr.streetLine1,
      billing_address_2: addr.streetLine2 || '',
      billing_city: addr.city,
      billing_pincode: addr.pincode,
      billing_state: addr.state,
      billing_country: addr.country,
      billing_email: order.user.email,
      billing_phone: order.user.phone || addr.phone,
      shipping_is_billing: true,
      order_items: order.items.map((item) => ({
        name: item.title,
        sku: item.sku || item.productId,
        units: item.quantity,
        selling_price: item.unitPrice,
      })),
      payment_method: order.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
      sub_total: order.total,
      length: 20,
      breadth: 15,
      height: 5,
      weight: 0.5,
    };

    try {
      const data = await this.shiprocketRequest('/orders/create/adhoc', 'POST', shiprocketPayload);

      // Create shipment record in DB
      const shipment = await this.prisma.shipment.create({
        data: {
          orderId,
          courier: 'shiprocket',
          trackingNumber: data.tracking_number || null,
          awbNumber: data.awb_code || null,
          status: 'created',
          estimatedDelivery: data.estimated_delivery
            ? new Date(data.estimated_delivery)
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Update order status
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'SHIPPED' },
      });

      await this.prisma.orderStatusHistory.create({
        data: { orderId, status: 'SHIPPED', note: `Shipment created via Shiprocket. AWB: ${data.awb_code || 'pending'}` },
      });

      this.logger.log(`Shipment created for order ${order.orderNumber}: AWB ${data.awb_code}`);
      return shipment;
    } catch (error) {
      this.logger.error(`Failed to create Shiprocket shipment: ${(error as Error).message}`);
      // Still create local record for manual processing
      const shipment = await this.prisma.shipment.create({
        data: { orderId, courier: 'shiprocket', status: 'failed' },
      });
      return shipment;
    }
  }

  // ─── Tracking ────────────────────────────────────────

  async getTrackingInfo(trackingNumber: string) {
    // Get from DB first
    const shipment = await this.prisma.shipment.findFirst({
      where: { OR: [{ trackingNumber }, { awbNumber: trackingNumber }] },
      include: { trackingEvents: { orderBy: { timestamp: 'desc' } }, order: true },
    });

    // If we have an AWB, try live tracking from Shiprocket
    if (shipment?.awbNumber) {
      try {
        const data = await this.shiprocketRequest(`/courier/track/awb/${shipment.awbNumber}`);
        const activities = data?.tracking_data?.shipment_track_activities || [];

        // Sync new events to DB
        for (const activity of activities.slice(0, 5)) {
          const exists = await this.prisma.shipmentTracking.findFirst({
            where: { shipmentId: shipment.id, description: activity.activity, timestamp: new Date(activity.date) },
          });
          if (!exists) {
            await this.prisma.shipmentTracking.create({
              data: {
                shipmentId: shipment.id,
                status: activity['sr-status-label'] || activity.activity,
                location: activity.location || '',
                description: activity.activity,
                timestamp: new Date(activity.date),
              },
            });
          }
        }

        // Re-fetch with updated events
        return this.prisma.shipment.findFirst({
          where: { id: shipment.id },
          include: { trackingEvents: { orderBy: { timestamp: 'desc' } }, order: true },
        });
      } catch {
        // Return cached data if live tracking fails
      }
    }

    return shipment;
  }

  // ─── Cancel Shipment ─────────────────────────────────

  async cancelShipment(shipmentId: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment) throw new BadRequestException('Shipment not found');

    if (shipment.awbNumber) {
      try {
        await this.shiprocketRequest('/orders/cancel', 'POST', { ids: [shipment.orderId] });
      } catch (error) {
        this.logger.warn(`Shiprocket cancel failed: ${(error as Error).message}`);
      }
    }

    await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: 'cancelled' },
    });

    return { message: 'Shipment cancelled' };
  }

  // ─── Webhook Handler ─────────────────────────────────

  async handleShiprocketWebhook(payload: any) {
    const awb = payload.awb;
    if (!awb) return;

    const shipment = await this.prisma.shipment.findFirst({ where: { awbNumber: awb } });
    if (!shipment) return;

    const status = payload.current_status || payload.status;

    await this.prisma.shipmentTracking.create({
      data: {
        shipmentId: shipment.id,
        status,
        location: payload.current_status_description || '',
        description: payload.current_status_description || status,
        timestamp: new Date(),
      },
    });

    // Map Shiprocket status to our OrderStatus
    const statusMap: Record<string, string> = {
      '6': 'SHIPPED',
      '7': 'DELIVERED',
      '8': 'CANCELLED',
      '17': 'OUT_FOR_DELIVERY',
      '18': 'SHIPPED', // In Transit
    };

    const orderStatus = statusMap[payload.current_status_id];
    if (orderStatus) {
      await this.prisma.order.update({
        where: { id: shipment.orderId },
        data: {
          status: orderStatus as any,
          ...(orderStatus === 'DELIVERED' && { deliveredAt: new Date() }),
        },
      });
      await this.prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          status: orderStatus.toLowerCase(),
          ...(orderStatus === 'DELIVERED' && { deliveredAt: new Date() }),
        },
      });
    }

    this.logger.log(`Webhook: AWB ${awb} → ${status}`);
  }
}
