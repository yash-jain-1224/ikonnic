import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Integration tests for DTO validation across all endpoints.
 * Verifies that the ValidationPipe + class-validator decorators reject bad input.
 */
describe('DTO Validation (Integration)', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth DTOs', () => {
    it('POST /auth/register — reject missing email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ password: 'Pass123!', firstName: 'A', lastName: 'B' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('email');
        });
    });

    it('POST /auth/register — reject short password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'valid@test.com', password: '12', firstName: 'A', lastName: 'B' })
        .expect(400);
    });

    it('POST /auth/login — reject empty body', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);
    });

    it('POST /auth/refresh — reject missing refreshToken', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);
    });

    it('POST /auth/forgot-password — reject invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'not-email' })
        .expect(400);
    });

    it('POST /auth/reset-password — reject missing fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ email: 'test@test.com' })
        .expect(400);
    });
  });

  describe('Cart DTOs', () => {
    it('POST /cart/items — reject missing productId', () => {
      return request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({ quantity: 1, unitPrice: 500 })
        .expect(400);
    });

    it('POST /cart/items — reject negative quantity', () => {
      return request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({ productId: 'x', quantity: -1, unitPrice: 500 })
        .expect(400);
    });

    it('PUT /cart/items/x — reject negative quantity', () => {
      return request(app.getHttpServer())
        .put('/api/v1/cart/items/some-id')
        .send({ quantity: 0 })
        .expect(400);
    });
  });

  describe('Coupon DTOs', () => {
    it('POST /coupons/validate — reject missing code', () => {
      return request(app.getHttpServer())
        .post('/api/v1/coupons/validate')
        .send({ cartTotal: 1000 })
        .expect(400);
    });

    it('POST /coupons/validate — reject negative cartTotal', () => {
      return request(app.getHttpServer())
        .post('/api/v1/coupons/validate')
        .send({ code: 'TEST', cartTotal: -100 })
        .expect(400);
    });

    it('POST /coupons/validate — reject extra fields (whitelist)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/coupons/validate')
        .send({ code: 'TEST', cartTotal: 1000, hacker: 'injection' })
        .expect(400);
    });
  });

  describe('Payment DTOs', () => {
    // These require auth, but validation should fail first if using invalid body
    it('POST /payments/initiate — reject empty body (after auth check)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .send({})
        .expect(401); // Auth check happens before validation for guarded routes
    });
  });

  describe('Upload DTOs', () => {
    it('POST /upload/sas-url — reject empty body (requires auth)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/upload/sas-url')
        .send({})
        .expect(401);
    });
  });

  describe('Review DTOs', () => {
    it('POST /reviews — reject rating > 5 (requires auth)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/reviews')
        .send({ productId: 'x', rating: 6, text: 'bad' })
        .expect(401); // Auth checked first
    });
  });

  describe('Products Query DTO', () => {
    it('GET /products?page=-1 — reject negative page', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products?page=-1')
        .expect(400);
    });

    it('GET /products?limit=0 — reject zero limit', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products?limit=0')
        .expect(400);
    });

    it('GET /products?page=1&limit=10 — accept valid params', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products?page=1&limit=10')
        .expect(200);
    });
  });
});
