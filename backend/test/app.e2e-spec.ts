import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Mirror main.ts setup
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health', () => {
    it('GET /api/v1/health — should return 200 with status ok', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.timestamp).toBeDefined();
          expect(res.body.uptime).toBeDefined();
        });
    });

    it('GET /api/v1/health/ready — should return 200', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ready');
        });
    });
  });

  describe('Auth Flow', () => {
    const testUser = {
      email: `e2e-test-${Date.now()}@test.com`,
      password: 'TestPass123!',
      firstName: 'E2E',
      lastName: 'Tester',
    };
    let accessToken: string;
    let refreshToken: string;

    it('POST /api/v1/auth/register — should register a new user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
          expect(res.body.user.email).toBe(testUser.email);
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('POST /api/v1/auth/register — should reject duplicate email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('POST /api/v1/auth/register — should reject invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...testUser, email: 'not-an-email' })
        .expect(400);
    });

    it('POST /api/v1/auth/login — should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ identifier: testUser.email, password: testUser.password })
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('POST /api/v1/auth/login — should reject wrong password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ identifier: testUser.email, password: 'WrongPass!' })
        .expect(401);
    });

    it('POST /api/v1/auth/refresh — should refresh tokens', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('POST /api/v1/auth/refresh — should reject invalid token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token-here' })
        .expect(401);
    });

    it('GET /api/v1/users/profile — should get profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe(testUser.email);
          expect(res.body.firstName).toBe(testUser.firstName);
        });
    });

    it('GET /api/v1/users/profile — should reject without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .expect(401);
    });

    it('POST /api/v1/auth/logout — should revoke tokens', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);
    });

    // Cleanup
    afterAll(async () => {
      await prisma.user.deleteMany({ where: { email: testUser.email } });
    });
  });

  describe('Products (Public)', () => {
    it('GET /api/v1/products — should return paginated products', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('GET /api/v1/products?limit=5 — should respect pagination', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products?limit=5')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeLessThanOrEqual(5);
        });
    });

    it('GET /api/v1/products/featured — should return featured products', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products/featured')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('GET /api/v1/products/non-existent-slug — should return 404', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products/non-existent-slug-xyz-999')
        .expect(404);
    });
  });

  describe('Categories (Public)', () => {
    it('GET /api/v1/categories — should return categories', () => {
      return request(app.getHttpServer())
        .get('/api/v1/categories')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('GET /api/v1/categories/non-existent — should return 404', () => {
      return request(app.getHttpServer())
        .get('/api/v1/categories/non-existent-slug-xyz')
        .expect(404);
    });
  });

  describe('Search (Public)', () => {
    it('GET /api/v1/search?q=photo — should return search results', () => {
      return request(app.getHttpServer())
        .get('/api/v1/search?q=photo')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('products');
        });
    });

    it('GET /api/v1/search/autocomplete?q=acr — should return suggestions', () => {
      return request(app.getHttpServer())
        .get('/api/v1/search/autocomplete?q=acr')
        .expect(200);
    });
  });

  describe('Shipping (Public)', () => {
    it('GET /api/v1/shipping/check/110001 — should check serviceability', () => {
      return request(app.getHttpServer())
        .get('/api/v1/shipping/check/110001')
        .expect(200);
    });
  });
});
