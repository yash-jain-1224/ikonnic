import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * On serverless, every concurrently-scaled function instance opens its own
 * Prisma pool. Azure PostgreSQL (Burstable tier) allows only a few dozen
 * connections, so bursts — e.g. a frontend build prerendering every product
 * page — exhaust the server and crash instances with
 * PrismaClientInitializationError. Cap each instance to a single pooled
 * connection unless the DATABASE_URL already specifies its own limits.
 */
function serverlessSafeDbUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes('connection_limit')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}connection_limit=1&pool_timeout=20&connect_timeout=15`;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      datasources: { db: { url: serverlessSafeDbUrl() } },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }
    // Use transactions to clean in correct order
    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && !key.startsWith('_') && !key.startsWith('$'),
    );
    return Promise.all(
      models.map((modelKey) => (this as any)[modelKey]?.deleteMany?.()),
    );
  }
}
