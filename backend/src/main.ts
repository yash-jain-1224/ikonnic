import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

// Azure Application Insights (initialize before anything else)
const appInsightsKey = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
if (appInsightsKey) {
  try {
    const appInsights = require('applicationinsights');
    appInsights.setup(appInsightsKey)
      .setAutoCollectRequests(true)
      .setAutoCollectPerformance(true)
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(true)
      .setAutoCollectConsole(true, true)
      .start();
    console.log('📊 Azure Application Insights initialized');
  } catch (err) {
    console.warn('⚠️ Application Insights failed to initialize:', (err as Error).message);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Security
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
  });

  // Global prefix
  app.setGlobalPrefix(process.env.API_PREFIX || 'api');

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Ikonnic E-Commerce API')
    .setDescription('Complete REST API for Ikonnic personalized gifts e-commerce platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication & Authorization')
    .addTag('users', 'User Management')
    .addTag('products', 'Product Catalog')
    .addTag('categories', 'Category Management')
    .addTag('cart', 'Shopping Cart')
    .addTag('wishlist', 'Wishlist Management')
    .addTag('orders', 'Order Management')
    .addTag('payments', 'Payment Processing')
    .addTag('shipping', 'Shipping & Tracking')
    .addTag('coupons', 'Coupons & Discounts')
    .addTag('reviews', 'Product Reviews')
    .addTag('notifications', 'Notifications')
    .addTag('admin', 'Admin Operations')
    .addTag('search', 'Search & Filters')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 Ikonnic API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/docs`);
}
bootstrap();
