import { BasePlugin, PluginContext, PluginInitOptions, PluginState } from '../interface.js';

/**
 * 创建模拟的插件上下文
 * @returns 模拟的插件上下文对象
 */
function createMockContext(): PluginContext {
  return {
    getPlugin: jest.fn(),
    getConfig: jest.fn(),
    getLogger: jest.fn(() => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    })),
    getCache: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      has: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn()
    })),
    on: jest.fn(),
    emit: jest.fn()
  };
}

/**
 * 测试用具体插件类
 */
class ConcretePlugin extends BasePlugin {
  public initializeCallCount = 0;
  public enableCallCount = 0;
  public disableCallCount = 0;
  public uninstallCallCount = 0;
  
  constructor(id: string, autoEnable = true) {
    super({
      id,
      name: `Plugin ${id}`,
      version: '1.0.0',
      autoEnable
    });
  }
  
  protected async onInitialize(): Promise<void> {
    this.initializeCallCount++;
  }
  
  protected async onEnable(): Promise<void> {
    this.enableCallCount++;
  }
  
  protected async onDisable(): Promise<void> {
    this.disableCallCount++;
  }
  
  protected async onUninstall(): Promise<void> {
    this.uninstallCallCount++;
  }
  
  getApi() {
    return {
      customMethod: () => 'custom value'
    };
  }
}

describe('BasePlugin', () => {
  let plugin: ConcretePlugin;
  let mockContext: PluginContext;
  
  beforeEach(() => {
    plugin = new ConcretePlugin('test-plugin');
    mockContext = createMockContext();
  });
  
  describe('构造函数', () => {
    test('应设置默认元数据值', () => {
      expect(plugin.metadata.id).toBe('test-plugin');
      expect(plugin.metadata.name).toBe('Plugin test-plugin');
      expect(plugin.metadata.version).toBe('1.0.0');
      expect(plugin.metadata.loadOrder).toBe(100); // 默认值
      expect(plugin.metadata.autoEnable).toBe(true);
    });
    
    test('初始状态应为已注册', () => {
      expect(plugin.state).toBe(PluginState.REGISTERED);
    });
  });
  
  describe('生命周期方法', () => {
    test('initialize应调用onInitialize并设置状态', async () => {
      await plugin.initialize(mockContext);
      
      expect(plugin.initializeCallCount).toBe(1);
      expect(plugin.state).toBe(PluginState.ENABLED); // 因为设置了autoEnable
    });
    
    test('当autoEnable为false时不应自动启用', async () => {
      const nonAutoPlugin = new ConcretePlugin('non-auto', false);
      await nonAutoPlugin.initialize(mockContext);
      
      expect(nonAutoPlugin.state).toBe(PluginState.INITIALIZED);
      expect(nonAutoPlugin.enableCallCount).toBe(0);
    });
    
    test('forceEnable选项应覆盖autoEnable设置', async () => {
      const nonAutoPlugin = new ConcretePlugin('non-auto', false);
      const options: PluginInitOptions = { forceEnable: true };
      
      await nonAutoPlugin.initialize(mockContext, options);
      
      expect(nonAutoPlugin.enableCallCount).toBe(1);
      expect(nonAutoPlugin.state).toBe(PluginState.ENABLED);
    });
    
    test('initialize应合并配置选项', async () => {
      const options: PluginInitOptions = {
        config: { testOption: 'test value' }
      };
      
      await plugin.initialize(mockContext, options);
      
      expect(plugin.getConfig('testOption')).toBe('test value');
    });
    
    test('enable应调用onEnable并设置状态', async () => {
      await plugin.initialize(mockContext);
      await plugin.disable(); // 先禁用
      
      expect(plugin.state).toBe(PluginState.DISABLED);
      
      await plugin.enable();
      
      expect(plugin.enableCallCount).toBe(2); // 1次是初始化时，1次是显式调用
      expect(plugin.state).toBe(PluginState.ENABLED);
    });
    
    test('当插件未初始化时不能启用', async () => {
      // 不初始化插件
      await expect(plugin.enable()).rejects.toThrow();
      expect(plugin.state).toBe(PluginState.REGISTERED);
    });
    
    test('disable应调用onDisable并设置状态', async () => {
      await plugin.initialize(mockContext);
      await plugin.disable();
      
      expect(plugin.disableCallCount).toBe(1);
      expect(plugin.state).toBe(PluginState.DISABLED);
    });
    
    test('当插件未启用时不能禁用', async () => {
      // 初始化但不启用
      const nonAutoPlugin = new ConcretePlugin('non-auto', false);
      await nonAutoPlugin.initialize(mockContext);
      
      await expect(nonAutoPlugin.disable()).rejects.toThrow();
      expect(nonAutoPlugin.state).toBe(PluginState.INITIALIZED);
    });
    
    test('uninstall应调用onUninstall', async () => {
      await plugin.initialize(mockContext);
      await plugin.uninstall();
      
      expect(plugin.uninstallCallCount).toBe(1);
    });
    
    test('当插件启用时uninstall应先禁用它', async () => {
      await plugin.initialize(mockContext);
      
      // 确保插件处于启用状态
      expect(plugin.state).toBe(PluginState.ENABLED);
      
      await plugin.uninstall();
      
      expect(plugin.disableCallCount).toBe(1);
      expect(plugin.uninstallCallCount).toBe(1);
    });
  });
  
  describe('错误处理', () => {
    test('初始化失败时应设置错误状态', async () => {
      const errorPlugin = new class extends BasePlugin {
        constructor() {
          super({ id: 'error-plugin', name: 'Error Plugin', version: '1.0.0' });
        }
        
        protected async onInitialize(): Promise<void> {
          throw new Error('初始化错误');
        }
        
        protected async onEnable(): Promise<void> {}
        protected async onDisable(): Promise<void> {}
        protected async onUninstall(): Promise<void> {}
      };
      
      await expect(errorPlugin.initialize(mockContext)).rejects.toThrow('初始化错误');
      
      expect(errorPlugin.state).toBe(PluginState.ERROR);
      expect(errorPlugin.error).toBeDefined();
      expect(errorPlugin.error?.message).toBe('初始化错误');
    });
    
    test('启用失败时应设置错误状态', async () => {
      const errorPlugin = new class extends BasePlugin {
        constructor() {
          super({ id: 'error-plugin', name: 'Error Plugin', version: '1.0.0', autoEnable: false });
        }
        
        protected async onInitialize(): Promise<void> {}
        
        protected async onEnable(): Promise<void> {
          throw new Error('启用错误');
        }
        
        protected async onDisable(): Promise<void> {}
        protected async onUninstall(): Promise<void> {}
      };
      
      await errorPlugin.initialize(mockContext);
      await expect(errorPlugin.enable()).rejects.toThrow('启用错误');
      
      expect(errorPlugin.state).toBe(PluginState.ERROR);
      expect(errorPlugin.error).toBeDefined();
      expect(errorPlugin.error?.message).toBe('启用错误');
    });
    
    test('禁用失败时应设置错误状态', async () => {
      const errorPlugin = new class extends BasePlugin {
        constructor() {
          super({ id: 'error-plugin', name: 'Error Plugin', version: '1.0.0' });
        }
        
        protected async onInitialize(): Promise<void> {}
        protected async onEnable(): Promise<void> {}
        
        protected async onDisable(): Promise<void> {
          throw new Error('禁用错误');
        }
        
        protected async onUninstall(): Promise<void> {}
      };
      
      await errorPlugin.initialize(mockContext);
      await expect(errorPlugin.disable()).rejects.toThrow('禁用错误');
      
      expect(errorPlugin.state).toBe(PluginState.ERROR);
      expect(errorPlugin.error).toBeDefined();
      expect(errorPlugin.error?.message).toBe('禁用错误');
    });
  });
  
  describe('配置管理', () => {
    test('getConfig应返回整个配置对象', async () => {
      const configOptions: PluginInitOptions = {
        config: {
          option1: 'value1',
          option2: 42,
          nested: {
            key: 'value'
          }
        }
      };
      
      await plugin.initialize(mockContext, configOptions);
      
      const config = plugin.getConfig();
      expect(config).toEqual(configOptions.config);
    });
    
    test('getConfig应返回特定配置值', async () => {
      const configOptions: PluginInitOptions = {
        config: {
          option1: 'value1',
          option2: 42,
          nested: {
            key: 'value'
          }
        }
      };
      
      await plugin.initialize(mockContext, configOptions);
      
      expect(plugin.getConfig('option1')).toBe('value1');
      expect(plugin.getConfig('option2')).toBe(42);
      expect(plugin.getConfig('nested')).toEqual({ key: 'value' });
    });
  });
  
  describe('API暴露', () => {
    test('getApi应返回自定义API', () => {
      const api = plugin.getApi();
      expect(api).toHaveProperty('customMethod');
      expect(api.customMethod()).toBe('custom value');
    });
  });
}); 