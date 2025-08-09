import { BasePlugin, IPlugin, PluginState } from '../interface.js';
import { createPluginSystem } from '../index.js';
import { vi, expect, describe, test } from 'vitest';
import { makeTestAppConfig } from '../../../test-utils/config.js'
import { makeTestLogger } from '../../../test-utils/logger.js'

/**
 * 核心插件示例
 */
class CorePlugin extends BasePlugin {
  constructor() {
    super({
      id: 'core',
      name: 'Core Plugin',
      version: '1.0.0',
      description: '核心插件',
      loadOrder: 10 // 最先加载
    });
  }
  
  protected async onInitialize(): Promise<void> {}
  protected async onEnable(): Promise<void> {}
  protected async onDisable(): Promise<void> {}
  protected async onUninstall(): Promise<void> {}
  
  // 提供API给其他插件使用
  getApi() {
    return {
      getCoreVersion: () => this.metadata.version,
      getCoreStatus: () => 'running',
      performCoreAction: (action: string) => `执行核心动作: ${action}`
    };
  }
}

/**
 * 扩展插件示例（依赖核心插件）
 */
class ExtensionPlugin extends BasePlugin {
  private coreApi: any;
  
  constructor() {
    super({
      id: 'extension',
      name: 'Extension Plugin',
      version: '1.0.0',
      description: '扩展插件',
      dependencies: ['core'], // 依赖核心插件
      loadOrder: 20 // 在核心插件之后加载
    });
  }
  
  protected async onInitialize(): Promise<void> {
    // 获取核心插件API
    const corePlugin = this.context.getPlugin<CorePlugin>('core');
    if (!corePlugin) {
      throw new Error('Core plugin not found');
    }
    
    this.coreApi = corePlugin.getApi();
  }
  
  protected async onEnable(): Promise<void> {
    // 使用核心插件API
    const coreStatus = this.coreApi.getCoreStatus();
    this.context.getLogger('extension').info(`核心插件状态: ${coreStatus}`);
  }
  
  protected async onDisable(): Promise<void> {}
  protected async onUninstall(): Promise<void> {}
  
  // 提供API
  getApi() {
    return {
      getExtensionInfo: () => ({
        name: this.metadata.name,
        version: this.metadata.version,
        coreVersion: this.coreApi.getCoreVersion()
      }),
      doSomething: () => {
        return this.coreApi.performCoreAction('extension-triggered');
      }
    };
  }
}

/**
 * UI插件示例（依赖扩展插件）
 */
class UIPlugin extends BasePlugin {
  private extensionApi: any;
  
  constructor() {
    super({
      id: 'ui',
      name: 'UI Plugin',
      version: '1.0.0',
      description: 'UI界面插件',
      dependencies: ['extension'], // 依赖扩展插件
      loadOrder: 30 // 在扩展插件之后加载
    });
  }
  
  protected async onInitialize(): Promise<void> {
    // 获取扩展插件API
    const extensionPlugin = this.context.getPlugin<ExtensionPlugin>('extension');
    if (!extensionPlugin) {
      throw new Error('Extension plugin not found');
    }
    
    this.extensionApi = extensionPlugin.getApi();
  }
  
  protected async onEnable(): Promise<void> {
    // 使用扩展插件API
    const info = this.extensionApi.getExtensionInfo();
    this.context.getLogger('ui').info(`扩展插件信息: ${JSON.stringify(info)}`);
  }
  
  protected async onDisable(): Promise<void> {}
  protected async onUninstall(): Promise<void> {}
}

describe('插件系统集成测试', () => {
  test('应正确创建和初始化插件系统', async () => {
    const logger = makeTestLogger();
    
    // 清除模块缓存，确保每次测试使用新的实例
    vi.resetModules();
    
    // 创建插件系统
    const pluginSystem = createPluginSystem({
      autoDiscovery: false,
      builtinPlugins: [CorePlugin, ExtensionPlugin, UIPlugin],
      config: makeTestAppConfig(),
      logger
    });
    
    // 初始化插件系统
    const result = await pluginSystem.initialize({
      // 提供插件特定配置
      core: { 
        config: { setting1: 'value1' } 
      },
      extension: { 
        config: { setting2: 'value2' } 
      },
      ui: { 
        config: { setting3: 'value3' } 
      }
    });
    
    // 验证加载结果
    expect(result.loadedPlugins.length).toBe(3);
    expect(result.loadedPlugins).toContain('core');
    expect(result.loadedPlugins).toContain('extension');
    expect(result.loadedPlugins).toContain('ui');
    expect(result.errors.length).toBe(0);
    
    // 验证加载顺序
    const loadOrder = result.loadedPlugins;
    expect(loadOrder.indexOf('core')).toBeLessThan(loadOrder.indexOf('extension'));
    expect(loadOrder.indexOf('extension')).toBeLessThan(loadOrder.indexOf('ui'));
    
    // 验证插件状态
    const registry = pluginSystem.registry;
    const corePlugin = registry.getPlugin('core');
    const extensionPlugin = registry.getPlugin('extension');
    const uiPlugin = registry.getPlugin('ui');
    
    expect(corePlugin?.state).toBe(PluginState.ENABLED);
    expect(extensionPlugin?.state).toBe(PluginState.ENABLED);
    expect(uiPlugin?.state).toBe(PluginState.ENABLED);
    
    // 验证API调用
    const coreApi = corePlugin?.getApi();
    expect(coreApi?.getCoreVersion()).toBe('1.0.0');
    expect(coreApi?.getCoreStatus()).toBe('running');
    
    const extensionApi = extensionPlugin?.getApi();
    expect(extensionApi?.getExtensionInfo()).toEqual({
      name: 'Extension Plugin',
      version: '1.0.0',
      coreVersion: '1.0.0'
    });
    
    expect(extensionApi?.doSomething()).toBe('执行核心动作: extension-triggered');
  });
  
  test('应正确处理插件依赖变化', async () => {
    // 清除模块缓存，确保每次测试使用新的实例
    vi.resetModules();
    
    // 创建插件系统
    const pluginSystem = createPluginSystem({
      autoDiscovery: false,
      builtinPlugins: [CorePlugin, ExtensionPlugin, UIPlugin],
      config: makeTestAppConfig()
    });
    
    await pluginSystem.initialize({
      core: { config: { setting1: 'value1' } },
      extension: { config: { setting2: 'value2' } },
      ui: { config: { setting3: 'value3' } }
    });
    
    // 验证插件已加载
    const uiPlugin = pluginSystem.registry.getPlugin('ui');
    expect(uiPlugin).toBeDefined();
    
    // 禁用UI插件
    await pluginSystem.loader.disablePlugin('ui');
    
    // UI插件应该是禁用状态
    expect(uiPlugin?.state).toBe(PluginState.DISABLED);
    
    // 由于UI插件已禁用，此操作应成功（不应抛出）
    await expect(pluginSystem.loader.disablePlugin('extension')).resolves.toBeUndefined();
    
    // 扩展插件应该是禁用状态
    const extensionPlugin = pluginSystem.registry.getPlugin('extension');
    expect(extensionPlugin?.state).toBe(PluginState.DISABLED);
    
    // 重新启用扩展插件
    await pluginSystem.loader.enablePlugin('extension');
    expect(extensionPlugin?.state).toBe(PluginState.ENABLED);
  });
}); 