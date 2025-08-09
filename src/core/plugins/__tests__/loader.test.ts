import * as path from 'path';
import * as fs from 'fs/promises';
import { BasePlugin, IPlugin, PluginContext, PluginState } from '../interface.js';
import { PluginLoader, PluginLoaderOptions } from '../loader.js';
import { PluginRegistry } from '../registry.js';
import { vi, expect, describe, test, beforeEach } from 'vitest';
import { makeTestAppConfig } from '../../../test-utils/config.js'
import { makeTestLogger } from '../../../test-utils/logger.js'
import { makeTestPluginClass } from '../../../test-utils/plugin.js'

// 模拟依赖
vi.mock('fs/promises');
vi.mock('path');

/**
 * 测试插件基类
 */
class TestPlugin extends BasePlugin {
  initializeWasCalled = false;
  enableWasCalled = false;
  disableWasCalled = false;
  uninstallWasCalled = false;
  
  constructor(id = 'test-plugin', dependencies: string[] = []) {
    super({
      id,
      name: `Test Plugin ${id}`,
      version: '1.0.0',
      description: 'A test plugin',
      dependencies
    });
  }
  
  protected async onInitialize(): Promise<void> {
    this.initializeWasCalled = true;
  }
  
  protected async onEnable(): Promise<void> {
    this.enableWasCalled = true;
  }
  
  protected async onDisable(): Promise<void> {
    this.disableWasCalled = true;
  }
  
  protected async onUninstall(): Promise<void> {
    this.uninstallWasCalled = true;
  }
}

/**
 * 错误插件类
 */
class ErrorPlugin extends BasePlugin {
  constructor() {
    super({
      id: 'error-plugin',
      name: 'Error Plugin',
      version: '1.0.0'
    });
  }
  
  protected async onInitialize(): Promise<void> {
    throw new Error('初始化失败');
  }
  
  protected async onEnable(): Promise<void> {}
  protected async onDisable(): Promise<void> {}
  protected async onUninstall(): Promise<void> {}
}

/**
 * 创建测试加载器选项
 */
function createLoaderOptions(): PluginLoaderOptions {
  return {
    pluginsDir: './plugins',
    autoDiscovery: false,
    builtinPlugins: [],
    config: makeTestAppConfig(),
    logger: makeTestLogger()
  } as PluginLoaderOptions;
}

describe('PluginLoader', () => {
  // 重置fs模块的mock
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(path.join).mockImplementation((...paths) => paths.join('/'));
    vi.mocked(path.resolve).mockImplementation((p) => p);
  });
  
  describe('初始化', () => {
    test('应正确初始化加载器', async () => {
      const options = createLoaderOptions();
      const registry = new PluginRegistry();
      const loader = new PluginLoader(options, registry);
      
      await loader.initialize();
      
      expect(loader.getRegistry()).toBe(registry);
    });
    
    test('应注册内置插件', async () => {
      const options = {
        ...createLoaderOptions(),
        builtinPlugins: [
          TestPlugin,
          class extends TestPlugin {
            constructor() {
              super('plugin-2');
            }
          }
        ]
      };
      
      const registry = new PluginRegistry();
      const registerSpy = vi.spyOn(registry, 'registerPluginClass');
      
      const loader = new PluginLoader(options, registry);
      await loader.initialize();
      
      expect(registerSpy).toHaveBeenCalledTimes(2);
      expect(registry.hasPlugin('test-plugin')).toBe(true);
      expect(registry.hasPlugin('plugin-2')).toBe(true);
    });
    
    test('初始化多次应只执行一次', async () => {
      const options = {
        ...createLoaderOptions(),
        builtinPlugins: [TestPlugin]
      };
      
      const registry = new PluginRegistry();
      const registerSpy = vi.spyOn(registry, 'registerPluginClass');
      
      const loader = new PluginLoader(options, registry);
      await loader.initialize();
      await loader.initialize(); // 再次调用
      
      expect(registerSpy).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('插件发现', () => {
    test('当autoDiscovery为false时不应自动发现插件', async () => {
      const options = {
        ...createLoaderOptions(),
        autoDiscovery: false
      };
      
      const loader = new PluginLoader(options);
      const discoverSpy = vi.spyOn(loader as any, 'discoverPlugins');
      
      await loader.initialize();
      
      expect(discoverSpy).not.toHaveBeenCalled();
    });
    
    test('当autoDiscovery为true时应自动发现插件', async () => {
      const options = {
        ...createLoaderOptions(),
        autoDiscovery: true
      };
      
      // 模拟目录不存在
      vi.mocked(fs.access).mockRejectedValue(new Error('不存在'));
      
      const loader = new PluginLoader(options);
      const discoverSpy = vi.spyOn(loader as any, 'discoverPlugins');
      
      await loader.initialize();
      
      expect(discoverSpy).toHaveBeenCalled();
    });
  });
  
  describe('插件加载', () => {
    test('应按依赖顺序加载插件', async () => {
      const registry = new PluginRegistry();
      const loader = new PluginLoader(createLoaderOptions(), registry);
      
      // 注册相互依赖的插件
      registry.registerPluginClass(makeTestPluginClass('plugin-a'));
      registry.registerPluginClass(makeTestPluginClass('plugin-b', { dependencies: ['plugin-a'] }));
      
      // 初始化加载器
      await loader.initialize();
      
      // 加载插件
      const result = await loader.loadPlugins();
      
      expect(result.loadedPlugins).toContain('plugin-a');
      expect(result.loadedPlugins).toContain('plugin-b');
      expect(result.loadedPlugins.indexOf('plugin-a')).toBeLessThan(result.loadedPlugins.indexOf('plugin-b'));
    });
    
    test('应处理加载错误', async () => {
      const registry = new PluginRegistry();
      const loader = new PluginLoader(createLoaderOptions(), registry);
      
      registry.registerPluginClass(ErrorPlugin);
      
      const result = await loader.loadPlugins();
      
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].pluginId).toBe('error-plugin');
    });
    
    test('应提供插件特定配置', async () => {
      const registry = new PluginRegistry();
      const loader = new PluginLoader(createLoaderOptions(), registry);
      
      class ConfigPlugin extends TestPlugin {
        constructor() {
          super('config-plugin');
        }
        
        getPluginConfig(): any {
          return this.getConfig();
        }
      }
      
      registry.registerPluginClass(ConfigPlugin);
      await loader.initialize();
      
      // 提供插件特定配置
      await loader.loadPlugins({
        'config-plugin': {
          config: {
            option1: 'value1'
          }
        }
      });
      
      const plugin = registry.getPlugin<ConfigPlugin>('config-plugin');
      expect(plugin).toBeDefined();
      expect(plugin!.getPluginConfig()).toEqual({ option1: 'value1' });
    });
  });
  
  describe('插件生命周期管理', () => {
    test('应启用已加载的插件', async () => {
      const registry = new PluginRegistry();
      const loader = new PluginLoader(createLoaderOptions(), registry);
      
      // 注册一个非自动启用的插件
      registry.registerPluginClass(makeTestPluginClass('manual-plugin', { autoEnable: false }));
      
      await loader.initialize();
      await loader.loadPlugins();
      
      // 检查插件状态
      const plugin = registry.getPlugin('manual-plugin');
      expect(plugin).toBeDefined();
      expect(plugin!.state).toBe(PluginState.INITIALIZED);
      
      // 启用插件
      await loader.enablePlugin('manual-plugin');
      
      // 应已经是启用状态
      expect(plugin!.state).toBe(PluginState.ENABLED);
    });
    
    test('应禁用已启用的插件', async () => {
      const registry = new PluginRegistry();
      const loader = new PluginLoader(createLoaderOptions(), registry);
      
      registry.registerPluginClass(makeTestPluginClass('active-plugin'));
      
      await loader.initialize();
      await loader.loadPlugins();
      
      // 禁用插件
      await loader.disablePlugin('active-plugin');
      
      // 检查插件状态
      const plugin = registry.getPlugin('active-plugin');
      expect(plugin!.state).toBe(PluginState.DISABLED);
    });
    
    test('应卸载插件', async () => {
      const registry = new PluginRegistry();
      const loader = new PluginLoader(createLoaderOptions(), registry);
      
      registry.registerPluginClass(makeTestPluginClass('uninstall-plugin'));
      
      await loader.initialize();
      await loader.loadPlugins();
      
      // 卸载插件
      await loader.uninstallPlugin('uninstall-plugin');
      
      // 检查插件是否已从注册表中移除
      expect(registry.hasPlugin('uninstall-plugin')).toBe(false);
    });
    
    test('禁用有依赖关系的插件时应抛出错误', async () => {
      const registry = new PluginRegistry();
      const loader = new PluginLoader(createLoaderOptions(), registry);
      
      // 注册两个有依赖关系的插件
      registry.registerPluginClass(makeTestPluginClass('base-plugin'));
      registry.registerPluginClass(makeTestPluginClass('dependent-plugin', { dependencies: ['base-plugin'] }));
      
      await loader.initialize();
      await loader.loadPlugins();
      
      // 应拒绝禁用被依赖的插件
      await expect(loader.disablePlugin('base-plugin')).rejects.toThrow();
    });
  });
  
  describe('工具方法', () => {
    test('getEnabledPlugins应返回已启用的插件', async () => {
      const registry = new PluginRegistry();
      const loader = new PluginLoader(createLoaderOptions(), registry);
      
      // 注册两个插件
      registry.registerPluginClass(makeTestPluginClass('enabled-plugin'));
      registry.registerPluginClass(makeTestPluginClass('disabled-plugin'));
      
      await loader.initialize();
      await loader.loadPlugins();
      
      // 禁用第二个插件
      await loader.disablePlugin('disabled-plugin');
      
      const enabledPlugins = loader.getEnabledPlugins();
      expect(enabledPlugins.length).toBe(1);
      expect(enabledPlugins[0].metadata.id).toBe('enabled-plugin');
    });
  });
}); 