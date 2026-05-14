import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T = string>(key: string): Promise<T | undefined> {
    return this.cacheManager.get(key) as Promise<T | undefined>;
  }

  async set<T = string>(key: string, value: T, ttl?: number): Promise<void> {
    // Sólo usa número como argumento TTL
    if (ttl) {
      await this.cacheManager.set(key, value, ttl);
    } else {
      await this.cacheManager.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }
}
