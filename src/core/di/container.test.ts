import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import { ServiceContainer } from './container.js';
import { Injectable, Inject, Optional } from './decorators.js';

// --- Test Setup: Mock Services and Tokens (DEFINED AT TOP LEVEL) ---

const ILoggerService = Symbol('ILoggerService');
const IConfigService = Symbol('IConfigService');
const IDatabaseService = Symbol('IDatabaseService');

interface ILogger {
  log(message: string): void;
}

interface IConfig {
  get(key: string): string;
}

@Injectable()
class LoggerService implements ILogger {
  log(message: string) {}
}

@Injectable()
class ConfigService implements IConfig {
  get(key: string): string {
    return `value_for_${key}`;
  }
}

@Injectable()
class DatabaseService {
  constructor(
    @Inject(IConfigService) public config: IConfig,
    @Inject(ILoggerService) @Optional() public logger?: ILogger
  ) {}
}

@Injectable()
class ServiceA_AutoResolve {
    public logger: LoggerService;
    // 在测试环境中，显式使用 @Inject 装饰器以避免依赖元数据反射
    constructor(@Inject(LoggerService) logger: LoggerService) {
        this.logger = logger;
    }
}

// --- Test Suite ---

describe('ServiceContainer (Dependency Injection)', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  // --- 测试基本注册和解析 ---
  describe('Basic Registration and Resolution', () => {
    it('should register and resolve a singleton service', () => {
      container.registerSingleton(ILoggerService, LoggerService);
      const logger1 = container.resolve<ILogger>(ILoggerService);
      const logger2 = container.resolve<ILogger>(ILoggerService);
      expect(logger1).toBeInstanceOf(LoggerService);
      expect(logger1).toBe(logger2); // 单例应该是同一个实例
    });

    it('should register and resolve a transient service', () => {
      container.registerTransient(ILoggerService, LoggerService);
      const logger1 = container.resolve<ILogger>(ILoggerService);
      const logger2 = container.resolve<ILogger>(ILoggerService);
      expect(logger1).toBeInstanceOf(LoggerService);
      expect(logger2).toBeInstanceOf(LoggerService);
      expect(logger1).not.toBe(logger2); // 瞬态应该是不同的实例
    });

    it('should register and resolve an instance', () => {
      const myInstance = { special: 'instance' };
      container.registerInstance(ILoggerService, myInstance);
      const resolved = container.resolve(ILoggerService);
      expect(resolved).toBe(myInstance);
    });

    it('should register and resolve from a factory', () => {
        const factory = () => ({ created: 'from_factory' });
        container.registerFactory(ILoggerService, factory);
        const resolved = container.resolve(ILoggerService);
        expect(resolved).toEqual({ created: 'from_factory' });
    });
  });

  // --- 测试构造函数注入 ---
  describe('Constructor Injection', () => {

    // 将测试类定义在 describe 内部，it 外部，以确保元数据被正确发射。
    it('should inject dependencies into a service constructor', () => {
      container.registerSingleton(IConfigService, ConfigService);
      container.registerSingleton(ILoggerService, LoggerService);
      container.registerSingleton(IDatabaseService, DatabaseService);

      const dbService = container.resolve(IDatabaseService) as DatabaseService;
      expect(dbService).toBeInstanceOf(DatabaseService);
      expect(dbService.config).toBeInstanceOf(ConfigService);
      expect(dbService.logger).toBeInstanceOf(LoggerService);
    });

    it('should handle optional dependencies that are not registered', () => {
        container.registerSingleton(IConfigService, ConfigService);
        // 注意：这里我们故意不注册 ILoggerService
        container.registerSingleton(IDatabaseService, DatabaseService);
  
        const dbService = container.resolve(IDatabaseService) as DatabaseService;
        expect(dbService).toBeInstanceOf(DatabaseService);
        expect(dbService.config).toBeInstanceOf(ConfigService);
        expect(dbService.logger).toBeUndefined(); // 可选依赖应为 undefined
    });

    it('should resolve class dependencies with explicit @Inject decorator', () => {
        container.registerSingleton(LoggerService, LoggerService);
        container.registerSingleton(ServiceA_AutoResolve, ServiceA_AutoResolve);

        const serviceA = container.resolve(ServiceA_AutoResolve);
        expect(serviceA).toBeInstanceOf(ServiceA_AutoResolve);
        expect(serviceA.logger).toBeInstanceOf(LoggerService);
    });
  });

  // --- 测试错误处理 ---
  describe('Error Handling', () => {
    it('should throw an error if resolving an unregistered token', () => {
      expect(() => container.resolve(ILoggerService)).toThrow();
    });

    it('should throw an error if a non-optional dependency is missing', () => {
        @Injectable()
        class BadService {
            constructor(@Inject(ILoggerService) public logger: ILogger) {}
        }
        container.registerSingleton('BadService', BadService);
        
        expect(() => container.resolve('BadService')).toThrow(/Failed to resolve dependency for 'BadService'.*Reason: DI Error: No registration found/);
    });

    it('should throw an error on circular dependencies', () => {
      @Injectable() class ServiceA { constructor(@Inject('ServiceB') b: any) {} }
      @Injectable() class ServiceB { constructor(@Inject('ServiceA') a: any) {} }
      container.registerSingleton('ServiceA', ServiceA);
      container.registerSingleton('ServiceB', ServiceB);

      // 更新断言以匹配扁平化后的、精确的错误信息
      const expectedError = /DI Error: Failed to resolve dependency for 'ServiceA'.*Reason: Circular dependency detected: ServiceA -> ServiceB -> ServiceA/;
      expect(() => container.resolve('ServiceA')).toThrow(expectedError);
    });

    it('should throw an error when registering a class that is not @Injectable', () => {
        class NotInjectable {}
        expect(() => container.registerSingleton('NotInjectable', NotInjectable)).toThrow();
    });
  });
}); 