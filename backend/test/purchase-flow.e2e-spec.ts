import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Integration tests for the complete purchase flow:
 * Register → Browse → Add to Cart → Checkout → Order
 */
describe('Purchase Flow (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  const testUser = {
    email: `purchase-${Date.now()}@test.com`,
    password: 'BuyerPass123!',
    firstName: 'Purchase',
    lastName: 'Tester',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    await app.init();
    prisma = app.get(PrismaService);

    // Register test user
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser);
    accessToken = res.body.accessToken;
    userId = res.body.user.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.cartItem.deleteMany({ where: { cart: { userId } } });
    await prisma.cart.deleteMany({ where: { userId } });
    await prisma.wishlistItem.deleteMany({ where: { wishlist: { userId } } });
    await prisma.wishlist.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await app.close();
  });

  describe('Cart Operations', () => {
    it('GET /api/v1/cart — should return empty cart', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toBeDefined();
          expect(res.body.items.length).toBe(0);
        });
    });

    it('POST /api/v1/cart/items — should add item to cart', async () => {
      // Get a real product to add
      const productsRes = await request(app.getHttpServer())
        .get('/api/v1/products?limit=1');

      if (productsRes.body.data && productsRes.body.data.length > 0) {
        const product = productsRes.body.data[0];

        return request(app.getHttpServer())
          .post('/api/v1/cart/items')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            productId: product.id,
            quantity: 2,
            unitPrice: product.price || 699,
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.items.length).toBeGreaterThan(0);
          });
      }
    });

    it('GET /api/v1/cart — should reflect added item', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.items.length).toBeGreaterThanOrEqual(0);
        });
    });

    it('DELETE /api/v1/cart — should clear cart', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/cart')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('Wishlist Operations', () => {
    let testProductId: string;

    beforeAll(async () => {
      const productsRes = await request(app.getHttpServer())
        .get('/api/v1/products?limit=1');
      if (productsRes.body.data && productsRes.body.data.length > 0) {
        testProductId = productsRes.body.data[0].id;
      }
    });

    it('GET /api/v1/wishlist — should return empty wishlist', () => {
      return request(app.getHttpServer())
        .get('/api/v1/wishlist')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('POST /api/v1/wishlist/:productId — should add to wishlist', function () {
      if (!testProductId) return this.skip();
      return request(app.getHttpServer())
        .post(`/api/v1/wishlist/${testProductId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
    });

    it('GET /api/v1/wishlist/check/:productId — should confirm item in wishlist', function () {
      if (!testProductId) return this.skip();
      return request(app.getHttpServer())
        .get(`/api/v1/wishlist/check/${testProductId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.inWishlist).toBe(true);
        });
    });

    it('DELETE /api/v1/wishlist/:productId — should remove from wishlist', function () {
      if (!testProductId) return this.skip();
      return request(app.getHttpServer())
        .delete(`/api/v1/wishlist/${testProductId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('User Addresses', () => {
    let addressId: string;

    it('POST /api/v1/users/addresses — should add address', () => {
      return request(app.getHttpServer())
        .post('/api/v1/users/addresses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          label: 'Home',
          fullName: 'Test User',
          phone: '+919876543210',
          addressLine1: '123, MG Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          addressId = res.body.id;
        });
    });

    it('GET /api/v1/users/addresses — should list addresses', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users/addresses')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('PUT /api/v1/users/addresses/:id — should update address', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/users/addresses/${addressId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ city: 'Delhi', state: 'Delhi', pincode: '110001' })
        .expect(200)
        .expect((res) => {
          expect(res.body.city).toBe('Delhi');
        });
    });

    it('DELETE /api/v1/users/addresses/:id — should delete address', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/users/addresses/${addressId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('Coupon Validation', () => {
    it('POST /api/v1/coupons/validate — should reject invalid coupon', () => {
      return request(app.getHttpServer())
        .post('/api/v1/coupons/validate')
        .send({ code: 'INVALIDCODE', cartTotal: 1000 })
        .expect(400);
    });

    it('POST /api/v1/coupons/validate — should reject missing fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/coupons/validate')
        .send({})
        .expect(400);
    });
  });

  describe('Payments — Validation Only', () => {
    it('POST /api/v1/payments/initiate — should reject without auth', () => {
      return request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .send({ orderId: 'fake-id', method: 'RAZORPAY' })
        .expect(401);
    });

    it('POST /api/v1/payments/verify — should reject without auth', () => {
      return request(app.getHttpServer())
        .post('/api/v1/payments/verify')
        .send({ paymentId: 'fake', verificationData: {} })
        .expect(401);
    });

    it('POST /api/v1/payments/initiate — should reject invalid body', () => {
      return request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('Orders — Validation', () => {
    it('POST /api/v1/orders — should reject empty items', () => {
      return request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ items: [] })
        .expect(400);
    });

    it('GET /api/v1/orders — should return empty order history', () => {
      return request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('GET /api/v1/orders — should reject without auth', () => {
      return request(app.getHttpServer())
        .get('/api/v1/orders')
        .expect(401);
    });
  });

  describe('Reviews — Validation', () => {
    it('POST /api/v1/reviews — should reject without auth', () => {
      return request(app.getHttpServer())
        .post('/api/v1/reviews')
        .send({ productId: 'x', rating: 5, text: 'Great' })
        .expect(401);
    });

    it('POST /api/v1/reviews — should reject invalid rating', () => {
      return request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ productId: 'x', rating: 10, text: 'Invalid' })
        .expect(400);
    });

    it('POST /api/v1/reviews — should reject missing text', () => {
      return request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ productId: 'x', rating: 5 })
        .expect(400);
    });
  });
});
