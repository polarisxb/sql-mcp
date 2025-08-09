// 导入所需的类型和类
import { 
  PluginMetadata,
  PluginContext,
  PluginInitOptions,
  PluginState,
  IPlugin,
  BasePlugin,
  PluginConstructor
} from './interface.js';

import {
  PluginRegistry,
  PluginRegistryEvent,
  PluginRegistryError,
  PluginDependencyError
} from './registry.js';

import {
  PluginLoader,
  PluginLoaderOptions,
  PluginLoadResult,
  PluginDiscoveryMethod
} from './loader.js';

// 重新导出接口和基类
export {
  PluginMetadata,
  PluginContext,
  PluginInitOptions,
  PluginState,
  IPlugin,
  BasePlugin,
  PluginConstructor
};

// 重新导出注册表
export {
  PluginRegistry,
  PluginRegistryEvent,
  PluginRegistryError,
  PluginDependencyError
};

// 重新导出加载器
export {
  PluginLoader,
  PluginLoaderOptions,
  PluginLoadResult,
  PluginDiscoveryMethod
};

/**
 * 创建插件系统
 * @param options 插件加载器选项
 * @returns 插件系统实例
 */
export function createPluginSystem(options: PluginLoaderOptions) {
  const registry = new PluginRegistry();
  const loader = new PluginLoader(options, registry);
  
  return {
    registry,
    loader,
    /**
     * 初始化插件系统
     * @param pluginOptions 插件初始化选项
     */
    async initialize(pluginOptions?: Record<string, PluginInitOptions>) {
      await loader.initialize();
      return loader.loadPlugins(pluginOptions);
    }
  };
} 