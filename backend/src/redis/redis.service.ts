import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;
  private memoryCache = new Map<string, { value: string; expiresAt?: number }>();
  private readonly logger = new Logger(RedisService.name);
  private isConnected = false;

  constructor(private configService: ConfigService) {
    const redisHost = this.configService.get('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get('REDIS_PORT', 6379);
    const redisEnabled = this.configService.get('REDIS_ENABLED', 'false');

    if (redisEnabled === 'true' || redisEnabled === '1') {
      try {
        this.client = new Redis({
          host: redisHost,
          port: redisPort,
          password: this.configService.get('REDIS_PASSWORD', '') || undefined,
          retryStrategy: (times) => {
            if (times > 3) {
              this.logger.warn('Redis connection failed after 3 retries, using in-memory fallback');
              return null; // stop retrying
            }
            return Math.min(times * 100, 2000);
          },
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });

        this.client.on('connect', () => {
          this.isConnected = true;
          this.logger.log('Redis connected successfully');
        });

        this.client.on('error', (err) => {
          this.isConnected = false;
          this.logger.warn(`Redis error: ${err.message}. Using in-memory cache fallback.`);
        });

        this.client.connect().catch(() => {
          this.isConnected = false;
          this.logger.warn('Redis not available. Using in-memory cache fallback.');
        });
      } catch {
        this.logger.warn('Redis initialization failed. Using in-memory cache fallback.');
      }
    } else {
      this.logger.log('Redis disabled. Using in-memory cache (suitable for development/MVP).');
    }
  }

  async onModuleDestroy() {
    if (this.client && this.isConnected) {
      await this.client.quit();
    }
  }

  getClient(): Redis | null {
    return this.isConnected ? this.client : null;
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.get(key);
      } catch {
        // fallback to memory
      }
    }
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        if (ttlSeconds) {
          await this.client.setex(key, ttlSeconds, value);
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch {
        // fallback to memory
      }
    }
    this.memoryCache.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async del(key: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
        return;
      } catch {
        // fallback
      }
    }
    this.memoryCache.delete(key);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.set(key, serialized, ttlSeconds);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
        return;
      } catch {
        // fallback
      }
    }
    // In-memory pattern matching
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  async increment(key: string): Promise<number> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.incr(key);
      } catch {
        // fallback
      }
    }
    const current = await this.get(key);
    const newVal = (parseInt(current || '0', 10) || 0) + 1;
    await this.set(key, String(newVal));
    return newVal;
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.expire(key, seconds);
        return;
      } catch {
        // fallback
      }
    }
    const entry = this.memoryCache.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + seconds * 1000;
    }
  }
}
