import 'reflect-metadata';
import { 
  INJECT_METADATA_KEY, 
  INJECTABLE_METADATA_KEY, 
  OPTIONAL_METADATA_KEY 
} from './decorators.js';

/**
 * 表示一个可用于DI容器解析的构造函数类型。
 * @template T 实例类型
 */
export type Constructor<T = any> = new (...args: any[]) => T;

/**
 * 表示一个依赖注入的标识符（Token）。
 * 可以是一个类构造函数本身，也可以是一个Symbol或字符串。
 * @template T 实例类型
 */
export type Token<T = any> = Constructor<T> | symbol | string;

/**
 * 服务的生命周期类型。
 * - Singleton: 在容器的生命周期内，只创建唯一一个实例。
 * - Transient: 每次请求解析时，都创建一个新的实例。
 */
export enum Lifecycle {
  Singleton = 'Singleton',
  Transient = 'Transient',
}

/**
 * 内部用于存储服务注册信息的接口。
 */
interface Registration<T = any> {
  token: Token<T>;
  factory: (container: ServiceContainer) => T;
  lifecycle: Lifecycle;
  instance?: T; // 仅用于 Singleton
}

/**
 * 一个功能强大的依赖注入（DI）容器。
 * 负责服务的注册、解析和生命周期管理。
 */
export class ServiceContainer {
  private readonly registrations = new Map<Token, Registration>();
  private readonly resolutionStack = new Set<Token>();

  /**
   * 将一个类注册为单例服务。
   * @template T 服务类型
   * @param {Token<T>} token - 依赖标识符
   * @param {Constructor<T>} ctor - 服务的构造函数
   */
  public registerSingleton<T>(token: Token<T>, ctor: Constructor<T>): void {
    this.register(token, ctor, Lifecycle.Singleton);
  }

  /**
   * 将一个类注册为瞬态服务。
   * @template T 服务类型
   * @param {Token<T>} token - 依赖标识符
   * @param {Constructor<T>} ctor - 服务的构造函数
   */
  public registerTransient<T>(token: Token<T>, ctor: Constructor<T>): void {
    this.register(token, ctor, Lifecycle.Transient);
  }

  /**
   * 注册一个工厂函数，用于创建服务的实例。
   * 工厂函数默认为瞬态生命周期。
   * @template T 服务类型
   * @param {Token<T>} token - 依赖标识符
   * @param {() => T} factory - 创建实例的工厂函数
   */
  public registerFactory<T>(token: Token<T>, factory: (container: ServiceContainer) => T, lifecycle: Lifecycle = Lifecycle.Transient): void {
    this.registrations.set(token, {
      token,
      factory,
      lifecycle,
    });
  }

  /**
   * 直接注册一个已经创建好的实例作为单例服务。
   * @template T 服务类型
   * @param {Token<T>} token - 依赖标识符
   * @param {T} instance - 服务的实例
   */
  public registerInstance<T>(token: Token<T>, instance: T): void {
    this.registrations.set(token, {
      token,
      factory: () => instance,
      lifecycle: Lifecycle.Singleton,
      instance,
    });
  }

  /**
   * 从容器中解析一个服务的实例。
   * @template T 服务类型
   * @param {Token<T>} token - 依赖标识符
   * @returns {T} 服务的实例
   * @throws {Error} 如果找不到注册或存在循环依赖
   */
  public resolve<T>(token: Token<T>): T {
    if (this.resolutionStack.has(token)) {
      const path = [...this.resolutionStack, token].map(t => String(t.toString())).join(' -> ');
      throw new Error(`Circular dependency detected: ${path}`);
    }

    const registration = this.registrations.get(token);
    if (!registration) {
      throw new Error(`DI Error: No registration found for token: ${String(token.toString())}`);
    }

    this.resolutionStack.add(token);

    try {
      if (registration.lifecycle === Lifecycle.Singleton) {
        if (!registration.instance) {
          registration.instance = registration.factory(this);
        }
        return registration.instance;
      }
      return registration.factory(this);
    } finally {
      this.resolutionStack.delete(token);
    }
  }

  /**
   * 注册一个类，生命周期由 @Injectable 装饰器决定，或默认为瞬态。
   */
  private register<T>(token: Token<T>, ctor: Constructor<T>, lifecycle: Lifecycle): void {
    if (Reflect.getMetadata(INJECTABLE_METADATA_KEY, ctor) !== true) {
      throw new Error(`Cannot register '${ctor.name}'. It is not marked as @Injectable().`);
    }

    this.registrations.set(token, {
      token,
      factory: (container) => container.createInstance(ctor),
      lifecycle,
    });
  }

  /**
   * 创建一个类的实例，并自动解析其构造函数依赖。
   * @template T 实例类型
   * @param {Constructor<T>} ctor - 类的构造函数
   * @returns {T} 创建的实例
   */
  private createInstance<T>(ctor: Constructor<T>): T {
    const injectionTokens = Reflect.getOwnMetadata(INJECT_METADATA_KEY, ctor) || [];
    const paramTypes = Reflect.getOwnMetadata('design:paramtypes', ctor) || [];
    const optionalParams = Reflect.getOwnMetadata(OPTIONAL_METADATA_KEY, ctor) || [];

    const params = Array.from({ length: ctor.length }).map((_, index) => {
      // 优先使用 @Inject(Token) 提供的显示标识符，否则回退到反射的类型。
      const injectionToken = injectionTokens[index] || paramTypes[index];
      const isOptional = optionalParams.includes(index);

      if (injectionToken === undefined) {
        if (isOptional) return undefined;
        throw new Error(`DI Error: Cannot resolve dependency for '${ctor.name}' at parameter index ${index}. Type is undefined or could not be reflected. This might be a circular file dependency. Please use the @Inject() decorator to explicitly specify the token.`);
      }

      try {
        return this.resolve(injectionToken);
      } catch (e: any) {
        // 如果解析失败 (例如, 依赖未注册或循环依赖)
        if (isOptional) {
          return undefined;
        }
        // 重新抛出错误，并附加上下文信息，形成一个扁平的错误消息
        throw new Error(`DI Error: Failed to resolve dependency for '${ctor.name}' with token '${String(injectionToken.toString())}' at parameter index ${index}. Reason: ${e.message}`);
      }
    });

    return new ctor(...params);
  }
}

// 创建一个全局默认容器实例
export const container = new ServiceContainer(); 