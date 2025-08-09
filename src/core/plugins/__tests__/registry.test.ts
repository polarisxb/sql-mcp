import { BasePlugin, IPlugin, PluginMetadata, PluginState } from '../interface.js';
import { PluginDependencyError, PluginRegistry, PluginRegistryError } from '../registry.js';

/**
 * 测试用插件类
 */
class TestPlugin extends BasePlugin {
  constructor(metadata: PluginMetadata) {
    super(metadata);
  }
  
  protected async onInitialize(): Promise<void> {}
  protected async onEnable(): Promise<void> {}
  protected async onDisable(): Promise<void> {}
  protected async onUninstall(): Promise<void> {}
}

describe('PluginRegistry', () => {
  let registry: PluginRegistry;
  
  beforeEach(() => {
    registry = new PluginRegistry();
  });
  
  describe('插件注册', () => {
    test('应正确注册插件类', () => {
      class Plugin1 extends TestPlugin {
        constructor() {
          super({
            id: 'plugin1',
            name: 'Plugin 1',
            version: '1.0.0'
          });
        }
      }
      
      const metadata = registry.registerPluginClass(Plugin1);
      expect(metadata.id).toBe('plugin1');
      expect(registry.hasPlugin('plugin1')).toBe(true);
    });
    
    test('应正确注册插件实例', () => {
      const plugin = new TestPlugin({
        id: 'plugin2',
        name: 'Plugin 2',
        version: '1.0.0'
      });
      
      const registered = registry.registerPlugin(plugin);
      expect(registered).toBe(plugin);
      expect(registry.hasPlugin('plugin2')).toBe(true);
      expect(registry.getPlugin('plugin2')).toBe(plugin);
    });
    
    test('不允许注册无效的插件ID', () => {
      const plugin = new TestPlugin({
        id: '',
        name: 'Invalid Plugin',
        version: '1.0.0'
      });
      
      expect(() => registry.registerPlugin(plugin)).toThrow(PluginRegistryError);
    });
    
    test('不允许重复注册同一插件ID', () => {
      registry.registerPlugin(
        new TestPlugin({
          id: 'unique',
          name: 'Unique Plugin',
          version: '1.0.0'
        })
      );
      
      expect(() => 
        registry.registerPlugin(
          new TestPlugin({
            id: 'unique',
            name: 'Duplicate Plugin',
            version: '2.0.0'
          })
        )
      ).toThrow(PluginRegistryError);
    });
    
    test('应触发注册事件', () => {
      const listener = jest.fn();
      registry.on('registered', listener);
      
      const metadata = {
        id: 'event-test',
        name: 'Event Test',
        version: '1.0.0'
      };
      
      registry.registerPlugin(new TestPlugin(metadata));
      
      expect(listener).toHaveBeenCalledWith(expect.objectContaining(metadata));
    });
  });
  
  describe('插件检索', () => {
    beforeEach(() => {
      // 注册多个测试插件
      registry.registerPlugin(
        new TestPlugin({
          id: 'plugin-a',
          name: 'Plugin A',
          version: '1.0.0'
        })
      );
      
      registry.registerPlugin(
        new TestPlugin({
          id: 'plugin-b',
          name: 'Plugin B',
          version: '1.0.0',
          tags: ['test', 'utility']
        })
      );
      
      registry.registerPlugin(
        new TestPlugin({
          id: 'plugin-c',
          name: 'Plugin C',
          version: '1.0.0',
          loadOrder: 50
        })
      );
    });
    
    test('应正确检查插件是否存在', () => {
      expect(registry.hasPlugin('plugin-a')).toBe(true);
      expect(registry.hasPlugin('non-existent')).toBe(false);
    });
    
    test('应获取指定插件', () => {
      const plugin = registry.getPlugin('plugin-b');
      expect(plugin).toBeDefined();
      expect(plugin?.metadata.id).toBe('plugin-b');
    });
    
    test('应获取所有插件元数据', () => {
      const allMetadata = registry.getAllPluginMetadata();
      expect(allMetadata.length).toBe(3);
      expect(allMetadata.map(m => m.id).sort()).toEqual(['plugin-a', 'plugin-b', 'plugin-c'].sort());
    });
    
    test('应获取所有插件实例', () => {
      const allPlugins = registry.getAllPlugins();
      expect(allPlugins.length).toBe(3);
      expect(allPlugins.map(p => p.metadata.id).sort()).toEqual(['plugin-a', 'plugin-b', 'plugin-c'].sort());
    });
  });
  
  describe('插件卸载', () => {
    beforeEach(() => {
      registry.registerPlugin(
        new TestPlugin({
          id: 'removable',
          name: 'Removable Plugin',
          version: '1.0.0'
        })
      );
      
      registry.registerPlugin(
        new TestPlugin({
          id: 'dependent',
          name: 'Dependent Plugin',
          version: '1.0.0',
          dependencies: ['removable']
        })
      );
    });
    
    test('应成功注销无依赖的插件', () => {
      const result = registry.unregisterPlugin('removable');
      expect(result).toBe(true);
      expect(registry.hasPlugin('removable')).toBe(false);
    });
    
    test('应拒绝注销其他插件依赖的插件', () => {
      // 启用依赖插件模拟
      const dependent = registry.getPlugin('dependent');
      if (dependent) {
        (dependent as any)._state = PluginState.ENABLED;
      }
      
      expect(() => registry.unregisterPlugin('removable')).toThrow(PluginRegistryError);
      expect(registry.hasPlugin('removable')).toBe(true);
    });
    
    test('应触发注销事件', () => {
      const listener = jest.fn();
      registry.on('unregistered', listener);
      
      registry.unregisterPlugin('removable');
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'removable'
        })
      );
    });
  });
  
  describe('依赖管理', () => {
    test('应正确构建依赖图', () => {
      registry.registerPlugin(
        new TestPlugin({
          id: 'base',
          name: 'Base Plugin',
          version: '1.0.0'
        })
      );
      
      registry.registerPlugin(
        new TestPlugin({
          id: 'extension',
          name: 'Extension Plugin',
          version: '1.0.0',
          dependencies: ['base']
        })
      );
      
      const dependents = registry.getDependentPlugins('base');
      expect(dependents).toContain('extension');
    });
    
    test('应解析正确的加载顺序', () => {
      registry.registerPlugin(
        new TestPlugin({
          id: 'core',
          name: 'Core Plugin',
          version: '1.0.0',
          loadOrder: 10
        })
      );
      
      registry.registerPlugin(
        new TestPlugin({
          id: 'middleware',
          name: 'Middleware Plugin',
          version: '1.0.0',
          dependencies: ['core'],
          loadOrder: 20
        })
      );
      
      registry.registerPlugin(
        new TestPlugin({
          id: 'ui',
          name: 'UI Plugin',
          version: '1.0.0',
          dependencies: ['middleware'],
          loadOrder: 30
        })
      );
      
      const loadOrder = registry.resolveLoadOrder();
      
      // 核心插件应该首先加载
      expect(loadOrder.indexOf('core')).toBeLessThan(loadOrder.indexOf('middleware'));
      expect(loadOrder.indexOf('middleware')).toBeLessThan(loadOrder.indexOf('ui'));
    });
    
    test('应检测并拒绝循环依赖', () => {
      registry.registerPlugin(
        new TestPlugin({
          id: 'plugin-x',
          name: 'Plugin X',
          version: '1.0.0',
          dependencies: ['plugin-y']
        })
      );
      
      registry.registerPlugin(
        new TestPlugin({
          id: 'plugin-y',
          name: 'Plugin Y',
          version: '1.0.0',
          dependencies: ['plugin-z']
        })
      );
      
      registry.registerPlugin(
        new TestPlugin({
          id: 'plugin-z',
          name: 'Plugin Z',
          version: '1.0.0',
          dependencies: ['plugin-x']
        })
      );
      
      expect(() => registry.resolveLoadOrder()).toThrow(PluginRegistryError);
    });
    
    test('应检测缺失的依赖', () => {
      registry.registerPlugin(
        new TestPlugin({
          id: 'dependent-plugin',
          name: 'Dependent Plugin',
          version: '1.0.0',
          dependencies: ['missing-dependency']
        })
      );
      
      expect(() => registry.resolveLoadOrder()).toThrow(PluginDependencyError);
    });
  });
}); 