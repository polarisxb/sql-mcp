import { ICache, CacheOptions, CacheStats, CacheEntry } from './interface.js';

/**
 * 内存缓存实现
 * 基于Map的高性能内存缓存，支持TTL过期和LRU淘汰
 */
export class MemoryCache implements ICache {
  /**
   * 存储缓存条目的Map
   * 键为命名空间前缀的缓存键，值为缓存条目
   */
  private cache: Map<string, CacheEntry<any>> = new Map();
  
  /**
   * 缓存统计
   */
  private stats = {
    hits: 0,
    misses: 0,
    lastCleanup: new Date()
  };
  
  /**
   * 缓存配置选项
   */
  private readonly options: Required<CacheOptions>;
  
  /**
   * 当前命名空间
   */
  private readonly namespace: string;
  
  /**
   * 定时清理任务的计时器ID
   */
  private cleanupTimer: NodeJS.Timeout | null = null;
  
  /**
   * 构造内存缓存实例
   * @param options 缓存选项
   */
  constructor(options: CacheOptions = {}) {
    // 初始化默认配置
    this.options = {
      ttl: options.ttl ?? 3600, // 默认1小时
      maxSize: options.maxSize ?? 1000,
      namespace: options.namespace ?? 'default',
      cleanupInterval: options.cleanupInterval ?? 300000, // 默认5分钟
      compression: options.compression ?? false, // 内存缓存不需要压缩
      serialization: options.serialization ?? true
    };
    
    this.namespace = this.options.namespace;
    
    // 设置定期清理
    if (this.options.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup().catch(err => console.error('Cache cleanup error:', err));
      }, this.options.cleanupInterval);
      
      // 确保定时器不会阻止Node进程退出
      if (this.cleanupTimer.unref) {
        this.cleanupTimer.unref();
      }
    }
  }
  
  /**
   * 获取带有命名空间前缀的键
   * @param key 原始键
   * @returns 带前缀的键
   */
  private getNamespacedKey(key: string): string {
    return `${this.namespace}:${key}`;
  }
  
  /**
   * 清理过期的缓存条目
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry !== null && entry.expiry < now) {
        this.cache.delete(key);
        expiredCount++;
      }
    }
    
    this.stats.lastCleanup = new Date();
    
    // 当缓存大小超过限制时，强制执行LRU淘汰
    if (this.cache.size > this.options.maxSize) {
      await this.ensureCapacity();
    }
  }
  
  /**
   * 序列化值
   */
  private serialize<T>(value: T): T {
    if (!this.options.serialization) {
      return value;
    }
    
    try {
      // 序列化后再解析，创建深拷贝并验证可序列化性
      return JSON.parse(JSON.stringify(value));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`缓存值无法序列化: ${errorMessage}`);
    }
  }
  
  /**
   * 从缓存中获取值
   * @param key 缓存键
   * @returns 缓存的值或undefined（不存在或已过期）
   */
  async get<T>(key: string): Promise<T | undefined> {
    const namespacedKey = this.getNamespacedKey(key);
    const entry = this.cache.get(namespacedKey);
    
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }
    
    const now = Date.now();
    
    // 检查是否已过期
    if (entry.expiry !== null && entry.expiry < now) {
      this.cache.delete(namespacedKey);
      this.stats.misses++;
      return undefined;
    }
    
    // 更新最后访问时间和命中次数
    entry.lastAccessed = now;
    entry.hitCount = (entry.hitCount || 0) + 1;
    this.stats.hits++;
    
    return entry.value as T;
  }
  
  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 要缓存的值
   * @param ttl 可选的TTL覆盖（秒）
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const namespacedKey = this.getNamespacedKey(key);
    const now = Date.now();
    
    // 计算过期时间
    let expiry: number | null = null;
    if (ttl !== undefined) {
      expiry = ttl > 0 ? now + ttl * 1000 : null;
    } else if (this.options.ttl > 0) {
      expiry = now + this.options.ttl * 1000;
    }
    
    // 尝试序列化，确保可存储
    const serializedValue = this.serialize(value);
    
    // 当达到大小限制时，强制执行LRU淘汰
    // 注意：必须在添加新项之前执行，并且需要排除当前键可能已经存在的情况
    if (!this.cache.has(namespacedKey) && 
        this.cache.size >= this.options.maxSize) {
      this.evictLRU();
    }
    
    // 创建或更新缓存条目
    this.cache.set(namespacedKey, {
      value: serializedValue,
      expiry,
      lastAccessed: now,
      createdAt: now,
      hitCount: 0
    });
  }
  
  /**
   * LRU淘汰：删除最近最少使用的缓存项
   * 被设置为独立方法以便于测试和维护
   */
  private evictLRU(): void {
    // 如果没有达到最大大小，不需要淘汰
    if (this.cache.size < this.options.maxSize) {
      return;
    }
    
    // 按最后访问时间排序所有条目
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // 只删除一个最旧的条目
    if (entries.length > 0) {
      const oldestKey = entries[0][0];
      this.cache.delete(oldestKey);
    }
  }
  
  /**
   * 确保缓存不超过最大容量
   * 使用LRU策略淘汰最近最少使用的项
   */
  private async ensureCapacity(): Promise<void> {
    this.evictLRU();
  }
  
  /**
   * 检查键是否存在且未过期
   * @param key 缓存键
   * @returns 布尔值表示键是否有效
   */
  async has(key: string): Promise<boolean> {
    const namespacedKey = this.getNamespacedKey(key);
    const entry = this.cache.get(namespacedKey);
    
    if (!entry) {
      return false;
    }
    
    // 检查是否已过期
    if (entry.expiry !== null && entry.expiry < Date.now()) {
      this.cache.delete(namespacedKey);
      return false;
    }
    
    // has方法不应该更新访问时间，否则会影响LRU算法
    // 这就是之前测试失败的原因 - has方法意外更新了访问时间
    
    return true;
  }
  
  /**
   * 删除缓存键
   * @param key 要删除的缓存键
   * @returns 布尔值表示是否成功删除
   */
  async delete(key: string): Promise<boolean> {
    const namespacedKey = this.getNamespacedKey(key);
    return this.cache.delete(namespacedKey);
  }
  
  /**
   * 清除当前命名空间的所有缓存
   */
  async clear(): Promise<void> {
    // 只清除当前命名空间的缓存
    const prefix = `${this.namespace}:`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * 批量获取多个缓存键的值
   * @param keys 缓存键数组
   * @returns 值数组，未找到的项为undefined
   */
  async getMany<T>(keys: string[]): Promise<(T | undefined)[]> {
    return Promise.all(keys.map(key => this.get<T>(key)));
  }
  
  /**
   * 批量设置多个缓存键值对
   * @param entries 键值对数组
   * @param ttl 可选的TTL覆盖（秒）
   */
  async setMany<T>(entries: [string, T][], ttl?: number): Promise<void> {
    await Promise.all(entries.map(([key, value]) => this.set(key, value, ttl)));
  }
  
  /**
   * 批量删除多个缓存键
   * @param keys 要删除的缓存键数组
   * @returns 成功删除的数量
   */
  async deleteMany(keys: string[]): Promise<number> {
    const results = await Promise.all(keys.map(key => this.delete(key)));
    return results.filter(Boolean).length;
  }
  
  /**
   * 获取缓存统计信息
   * @returns 缓存统计对象
   */
  async getStats(): Promise<CacheStats> {
    const prefix = `${this.namespace}:`;
    const keys = Array.from(this.cache.keys())
      .filter(key => key.startsWith(prefix))
      .map(key => key.substring(prefix.length));
    
    // 计算近似内存使用量
    let memoryUsage = 0;
    try {
      for (const key of keys) {
        const entry = await this.get(key);
        if (entry) {
          memoryUsage += JSON.stringify(entry).length * 2; // 每个字符约2字节
        }
      }
    } catch (error) {
      // 忽略内存计算错误
    }
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: keys.length,
      keys,
      namespace: this.namespace,
      memoryUsage,
      lastCleanup: this.stats.lastCleanup
    };
  }
  
  /**
   * 获取当前命名空间的所有缓存键
   * @returns 缓存键数组
   */
  async getKeys(): Promise<string[]> {
    const prefix = `${this.namespace}:`;
    return Array.from(this.cache.keys())
      .filter(key => key.startsWith(prefix))
      .map(key => key.substring(prefix.length));
  }
  
  /**
   * 创建一个使用指定命名空间的新缓存实例
   * @param namespace 命名空间
   * @returns 新的缓存实例
   */
  withNamespace(namespace: string): ICache {
    return new MemoryCache({
      ...this.options,
      namespace
    });
  }
  
  /**
   * 获取缓存值，如果不存在则使用工厂函数设置并返回
   * @param key 缓存键
   * @param factory 缓存未命中时调用的工厂函数
   * @param ttl 可选的TTL覆盖（秒）
   * @returns 缓存值或工厂函数结果
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cachedValue = await this.get<T>(key);
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }
  
  /**
   * 释放资源，停止定时清理
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
} 