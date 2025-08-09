import { ICache, CacheOptions, CacheStats, CacheEntry } from './interface.js';
import { MemoryCache } from './memory.js';
import { FileCache, FileCacheOptions } from './file.js';

/**
 * 缓存类型枚举
 */
export enum CacheType {
  Memory = 'memory',
  File = 'file'
}

/**
 * 缓存工厂配置
 */
export interface CacheFactoryConfig {
  /**
   * 缓存类型
   */
  type: CacheType;
  
  /**
   * 缓存选项
   */
  options: CacheOptions | FileCacheOptions;
}

/**
 * 创建缓存实例
 * @param config 缓存配置
 * @returns 缓存实例
 */
export function createCache(config: CacheFactoryConfig): ICache {
  switch (config.type) {
    case CacheType.Memory:
      return new MemoryCache(config.options);
    case CacheType.File:
      if ('baseDir' in config.options) {
        return new FileCache(config.options as FileCacheOptions);
      }
      throw new Error('文件缓存需要baseDir选项');
    default:
      throw new Error(`不支持的缓存类型: ${config.type}`);
  }
}

/**
 * 从应用配置创建缓存实例
 * @param appConfig 应用配置
 * @returns 缓存实例
 */
export function createCacheFromConfig(appConfig: { cache: any }): ICache {
  const cacheConfig = appConfig.cache;
  
  if (!cacheConfig?.enabled) {
    // 缓存被禁用，返回无操作缓存
    return new NoOpCache();
  }
  
  const type = cacheConfig.storage === 'file' ? CacheType.File : CacheType.Memory;
  
  const options: CacheOptions = {
    ttl: cacheConfig.ttl,
    maxSize: cacheConfig.maxSize,
    namespace: 'default',
    compression: type === CacheType.File,
    serialization: true
  };
  
  if (type === CacheType.File) {
    return new FileCache({
      ...options,
      baseDir: cacheConfig.filePath || './cache'
    });
  }
  
  return new MemoryCache(options);
}

/**
 * 空操作缓存实现
 * 用于禁用缓存时，提供一个无实际操作的接口实现
 */
class NoOpCache implements ICache {
  async get<T>(): Promise<undefined> {
    return undefined;
  }
  
  async set<T>(): Promise<void> {}
  
  async has(): Promise<boolean> {
    return false;
  }
  
  async delete(): Promise<boolean> {
    return false;
  }
  
  async clear(): Promise<void> {}
  
  async getMany<T>(keys: string[]): Promise<(T | undefined)[]> {
    return keys.map(() => undefined);
  }
  
  async setMany<T>(): Promise<void> {}
  
  async deleteMany(): Promise<number> {
    return 0;
  }
  
  async getStats(): Promise<CacheStats> {
    return {
      hits: 0,
      misses: 0,
      size: 0,
      keys: [],
      namespace: 'noop'
    };
  }
  
  async getKeys(): Promise<string[]> {
    return [];
  }
  
  withNamespace(): ICache {
    return this;
  }
  
  async getOrSet<T>(key: string, factory: () => Promise<T>): Promise<T> {
    return factory();
  }
  
  async cleanup(): Promise<void> {}
}

// 导出所有类型和实现
export { ICache, CacheOptions, CacheStats, CacheEntry } from './interface.js';
export { MemoryCache } from './memory.js';
export { FileCache, FileCacheOptions } from './file.js'; 