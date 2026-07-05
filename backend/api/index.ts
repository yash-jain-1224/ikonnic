/**
 * Vercel Serverless Function Entry Point
 * Bootstraps the NestJS app and exports its handler for Vercel's serverless runtime.
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import express from 'express';
import type { Request, Response } from 'express';

const server = express();

let app: any;

async function bootstrap() {
  if (app) return app;

  const appInsightsKey = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  if (appInsightsKey) {
    try {
      const appInsights = require('applicationinsights');
      appInsights.setup(appInsightsKey)
        .setAutoCollectRequests(true)
        .setAutoCollectPerformance(true)
        .setAutoCollectExceptions(true)
        .setAutoCollectDependencies(true)
        .start();
    } catch {
      // Graceful fallback
    }
  }

  const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(server));

  nestApp.use(helmet());
  nestApp.use(compression());
  nestApp.use(cookieParser());

  nestApp.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'https://ikonnic.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
  });

  nestApp.setGlobalPrefix(process.env.API_PREFIX || 'api');
  nestApp.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  nestApp.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  await nestApp.init();
  app = nestApp;
  return app;
}

export default async function handler(req: Request, res: Response) {
  await bootstrap();
  server(req, res);
}
