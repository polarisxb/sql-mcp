/**
 * 缓存选项接口
 */
export interface CacheOptions {
  /**
   * 生存时间（秒）
   * 0表示不过期，undefined使用默认值
   */
  ttl?: number;
  
  /**
   * 最大缓存项目数
   * 当超过此数量时启用LRU淘汰策略
   */
  maxSize?: number;
  
  /**
   * 命名空间
   * 用于隔离不同模块的缓存
   */
  namespace?: string;
  
  /**
   * 清理间隔（毫秒）
   * 定期清理过期缓存项的间隔时间
   */
  cleanupInterval?: number;
  
  /**
   * 是否启用压缩
   * 仅适用于FileCache
   */
  compression?: boolean;
  
  /**
   * 是否启用序列化
   * 默认开启，将对象序列化为JSON存储
   */
  serialization?: boolean;
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  /** 缓存命中次数 */
  hits: number;
  
  /** 缓存未命中次数 */
  misses: number;
  
  /** 当前缓存项数量 */
  size: number;
  
  /** 所有缓存键名列表 */
  keys: string[];
  
  /** 内存占用（字节，如果可用） */
  memoryUsage?: number;
  
  /** 命名空间 */
  namespace: string;
  
  /** 最后清理时间 */
  lastCleanup?: Date;
}

/**
 * 缓存接口
 * 定义缓存系统的核心功能和方法
 */
export interface ICache {
  // 基本操作
  /**
   * 获取缓存值
   * @param key 缓存键
   * @returns 缓存值或undefined（如果不存在）
   */
  get<T>(key: string): Promise<T | undefined>;
  
  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 可选的TTL覆盖（秒）
   * @returns Promise<void>
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  
  /**
   * 检查缓存键是否存在
   * @param key 缓存键
   * @returns 是否存在
   */
  has(key: string): Promise<boolean>;
  
  /**
   * 删除缓存项
   * @param key 缓存键
   * @returns 是否成功删除
   */
  delete(key: string): Promise<boolean>;
  
  /**
   * 清空当前命名空间的所有缓存
   */
  clear(): Promise<void>;
  
  // 批量操作
  /**
   * 批量获取多个缓存值
   * @param keys 缓存键数组
   * @returns 对应的缓存值数组
   */
  getMany<T>(keys: string[]): Promise<(T | undefined)[]>;
  
  /**
   * 批量设置多个缓存值
   * @param entries 键值对数组
   * @param ttl 可选的TTL覆盖（秒）
   */
  setMany<T>(entries: [string, T][], ttl?: number): Promise<void>;
  
  /**
   * 批量删除多个缓存项
   * @param keys 缓存键数组
   * @returns 成功删除的数量
   */
  deleteMany(keys: string[]): Promise<number>;
  
  // 信息获取
  /**
   * 获取缓存统计信息
   */
  getStats(): Promise<CacheStats>;
  
  /**
   * 获取所有缓存键
   */
  getKeys(): Promise<string[]>;
  
  // 高级操作
  /**
   * 创建指定命名空间的缓存实例
   * @param namespace 命名空间
   */
  withNamespace(namespace: string): ICache;
  
  /**
   * 使用回调获取缓存，如果不存在则设置
   * @param key 缓存键
   * @param factory 当缓存不存在时调用的工厂函数
   * @param ttl 可选的TTL覆盖（秒）
   */
  getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>;
  
  /**
   * 手动触发过期项清理
   */
  cleanup(): Promise<void>;
}

/**
 * 缓存项接口
 * 表示缓存中存储的单个项目
 */
export interface CacheEntry<T> {
  /** 缓存的实际值 */
  value: T;
  
  /** 过期时间戳（毫秒），null表示永不过期 */
  expiry: number | null;
  
  /** 最后访问时间戳（毫秒） */
  lastAccessed: number;
  
  /** 创建时间戳（毫秒） */
  createdAt: number;
  
  /** 命中次数 */
  hitCount?: number;
}

/**
 * 缓存工厂类型
 */
export type CacheFactory = (options?: CacheOptions) => ICache; 