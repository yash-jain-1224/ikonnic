import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Integration tests for the Admin module.
 * Tests that @Roles('ADMIN', 'SUPER_ADMIN') is enforced correctly.
 */
describe('Admin Module (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let customerToken: string;

  const adminUser = {
    email: `admin-int-${Date.now()}@test.com`,
    password: 'AdminPass123!',
    firstName: 'Admin',
    lastName: 'Tester',
  };

  const customerUser = {
    email: `customer-int-${Date.now()}@test.com`,
    password: 'CustomerPass123!',
    firstName: 'Customer',
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

    // Register admin user and manually promote to ADMIN
    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(adminUser);
    adminToken = adminRes.body.accessToken;

    // Promote to ADMIN
    await prisma.user.update({
      where: { email: adminUser.email },
      data: { role: 'ADMIN' },
    });

    // Re-login to get token with ADMIN role
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: adminUser.email, password: adminUser.password });
    adminToken = adminLogin.body.accessToken;

    // Register customer user (stays CUSTOMER)
    const custRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(customerUser);
    customerToken = custRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [adminUser.email, customerUser.email] } },
    });
    await app.close();
  });

  describe('Role-Based Access Control', () => {
    it('GET /api/v1/admin/dashboard — admin should access', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('GET /api/v1/admin/dashboard — customer should be rejected (403)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('GET /api/v1/admin/dashboard — unauthenticated should be rejected (401)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .expect(401);
    });

    it('GET /api/v1/admin/orders — customer should be rejected (403)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('GET /api/v1/admin/products — admin should access', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('GET /api/v1/admin/users — admin should access', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('GET /api/v1/admin/coupons — customer should be rejected (403)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/coupons')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('GET /api/v1/admin/inventory — customer should be rejected (403)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/inventory')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('GET /api/v1/admin/analytics — admin should access', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Admin Product CRUD', () => {
    let productId: string;

    it('POST /api/v1/admin/products — should create product', () => {
      return request(app.getHttpServer())
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E Test Product',
          slug: `e2e-test-product-${Date.now()}`,
          price: 999,
          description: 'A test product',
          isActive: true,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.name).toBe('E2E Test Product');
          productId = res.body.id;
        });
    });

    it('GET /api/v1/admin/products/:id — should get product', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/admin/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(productId);
        });
    });

    it('PUT /api/v1/admin/products/:id — should update product', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/admin/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 1299 })
        .expect(200)
        .expect((res) => {
          expect(res.body.price).toBe(1299);
        });
    });

    it('DELETE /api/v1/admin/products/:id — should delete product', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/admin/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Admin Coupon CRUD', () => {
    let couponId: string;

    it('POST /api/v1/admin/coupons — should create coupon', () => {
      return request(app.getHttpServer())
        .post('/api/v1/admin/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: `E2ECOUPON${Date.now()}`,
          discountType: 'PERCENTAGE',
          discountValue: 15,
          isActive: true,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          couponId = res.body.id;
        });
    });

    it('PUT /api/v1/admin/coupons/:id — should update coupon', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/admin/coupons/${couponId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ discountValue: 20 })
        .expect(200);
    });

    it('DELETE /api/v1/admin/coupons/:id — should delete coupon', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/admin/coupons/${couponId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});
