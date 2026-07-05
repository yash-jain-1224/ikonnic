import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShippingService } from './shipping.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

describe('ShippingService', () => {
  let service: ShippingService;

  const prismaMock = {
    pincodeServiceability: { findUnique: jest.fn() },
    shipment: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    shipmentTracking: { findMany: jest.fn(), create: jest.fn() },
    order: { findUnique: jest.fn(), update: jest.fn() },
  };

  const redisMock = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const configMock = {
    get: jest.fn((key: string) => {
      const map: Record<string, string> = {
        SHIPROCKET_EMAIL: 'test@ship.com',
        SHIPROCKET_PASSWORD: 'pass',
      };
      return map[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ShippingService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: RedisService, useValue: redisMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();
    service = moduleRef.get(ShippingService);
  });

  describe('checkServiceability', () => {
    it('returns cached pincode data from DB', async () => {
      prismaMock.pincodeServiceability.findUnique.mockResolvedValue({
        pincode: '400001',
        isServiceable: true,
        city: 'Mumbai',
        state: 'Maharashtra',
        deliveryDays: 3,
        codAvailable: true,
        expressAvailable: true,
      });

      const result = await service.checkServiceability('400001');
      expect(result.serviceable).toBe(true);
      expect(result.city).toBe('Mumbai');
      expect(result.estimatedDays).toBe(3);
    });

    it('falls back to Shiprocket API if not in DB', async () => {
      prismaMock.pincodeServiceability.findUnique.mockResolvedValue(null);
      redisMock.get.mockResolvedValue('fake-token');

      // Mock global fetch
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            available_courier_companies: [
              { city: 'Delhi', state: 'Delhi', etd: '3-5 days', cod: 1 },
            ],
          },
        }),
      }) as any;

      const result = await service.checkServiceability('110001');
      expect(result.serviceable).toBe(true);

      global.fetch = originalFetch;
    });
  });

  describe('getShiprocketToken (via checkServiceability)', () => {
    it('uses cached token from Redis', async () => {
      redisMock.get.mockResolvedValue('cached-token');
      prismaMock.pincodeServiceability.findUnique.mockResolvedValue(null);

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { available_courier_companies: [] } }),
      }) as any;

      await service.checkServiceability('999999');
      // Fetch should only be called for the serviceability check, not for auth
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('serviceability');

      global.fetch = originalFetch;
    });
  });
});
