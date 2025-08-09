import * as path from 'path';
import * as fs from 'fs/promises';
import { ICache } from '../cache/interface.js';
import { PluginContext, IPlugin, PluginConstructor, PluginState, PluginInitOptions } from './interface.js';
import { PluginRegistry, PluginDependencyError, PluginRegistryEvent } from './registry.js';
import { ValidatedAppConfig } from '../config/schema.js';

/**
 * 插件发现方法
 */
export type PluginDiscoveryMethod = (options: PluginLoaderOptions) => Promise<PluginConstructor[]>;

/**
 * 插件加载器选项
 */
export interface PluginLoaderOptions {
  /**
   * 插件目录路径
   */
  pluginsDir?: string;
  
  /**
   * 是否启用自动发现
   */
  autoDiscovery?: boolean;
  
  /**
   * 自定义插件发现方法
   */
  discoveryMethods?: PluginDiscoveryMethod[];
  
  /**
   * 内置插件列表
   */
  builtinPlugins?: PluginConstructor[];
  
  /**
   * 全局配置
   */
  config: ValidatedAppConfig;
  
  /**
   * 缓存实例
   */
  cache?: ICache;
  
  /**
   * 日志函数
   */
  logger?: {
    debug: (message: string, ...args: any[]) => void;
    info: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
  };
}

/**
 * 插件加载结果
 */
export interface PluginLoadResult {
  /**
   * 已加载的插件ID
   */
  loadedPlugins: string[];
  
  /**
   * 加载过程中发生的错误
   */
  errors: { pluginId: string; error: Error }[];
}

/**
 * 插件加载器
 * 负责发现、加载和初始化插件
 */
export class PluginLoader {
  /**
   * 插件注册表
   */
  private registry: PluginRegistry;
  
  /**
   * 加载器选项
   */
  private options: Required<PluginLoaderOptions>;
  
  /**
   * 是否已初始化
   */
  private initialized = false;
  
  /**
   * 构造函数
   * @param options 加载器选项
   * @param registry 插件注册表实例
   */
  constructor(
    options: PluginLoaderOptions,
    registry: PluginRegistry = new PluginRegistry()
  ) {
    this.registry = registry;
    
    // 设置默认选项
    this.options = {
      pluginsDir: path.join(process.cwd(), 'plugins'),
      autoDiscovery: true,
      discoveryMethods: [this.discoverFromDirectory],
      builtinPlugins: [],
      config: options.config,
      cache: options.cache as ICache,
      logger: options.logger || {
        debug: console.debug,
        info: console.info,
        warn: console.warn,
        error: console.error
      }
    };
    
    // 覆盖默认选项
    Object.assign(this.options, options);
  }
  
  /**
   * 初始化插件加载器
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    // 注册内置插件
    for (const pluginClass of this.options.builtinPlugins) {
      this.registry.registerPluginClass(pluginClass);
    }
    
    // 自动发现插件
    if (this.options.autoDiscovery) {
      await this.discoverPlugins();
    }
    
    this.initialized = true;
  }
  
  /**
   * 发现可用的插件
   */
  async discoverPlugins(): Promise<void> {
    let discoveredPluginClasses: PluginConstructor[] = [];
    
    // 使用所有注册的发现方法
    for (const method of this.options.discoveryMethods) {
      try {
        const plugins = await method(this.options);
        discoveredPluginClasses = discoveredPluginClasses.concat(plugins);
      } catch (error) {
        this.options.logger.error(`Plugin discovery failed: ${(error as Error).message}`);
      }
    }
    
    // 注册发现的插件类
    for (const pluginClass of discoveredPluginClasses) {
      try {
        this.registry.registerPluginClass(pluginClass);
      } catch (error) {
        this.options.logger.warn(
          `Failed to register discovered plugin: ${(error as Error).message}`
        );
      }
    }
  }
  
  /**
   * 从目录加载插件
   * @param options 加载器选项
   * @returns 发现的插件类数组
   */
  private async discoverFromDirectory(options: PluginLoaderOptions): Promise<PluginConstructor[]> {
    const pluginsDir = options.pluginsDir;
    if (!pluginsDir) return [];
    
    try {
      // 检查目录是否存在
      await fs.access(pluginsDir);
    } catch (error) {
      options.logger?.warn(`Plugins directory does not exist: ${pluginsDir}`);
      return [];
    }
    
    const discoveredPlugins: PluginConstructor[] = [];
    
    try {
      // 读取目录内容
      const entries = await fs.readdir(pluginsDir, { withFileTypes: true });
      
      // 筛选目录
      const dirs = entries.filter(entry => entry.isDirectory());
      
      for (const dir of dirs) {
        const pluginDir = path.join(pluginsDir, dir.name);
        
        try {
          // 尝试加载plugin.js或index.js
          const mainFiles = ['plugin.js', 'index.js'];
          let mainFile: string | undefined;
          
          for (const file of mainFiles) {
            const filePath = path.join(pluginDir, file);
            try {
              await fs.access(filePath);
              mainFile = filePath;
              break;
            } catch {
              // 文件不存在，继续检查下一个
            }
          }
          
          if (!mainFile) {
            options.logger?.debug(`No plugin main file found in ${pluginDir}`);
            continue;
          }
          
          // 动态加载模块
          const modulePath = path.resolve(mainFile);
          const module = await import(`file://${modulePath}`);
          
          // 查找插件类
          const pluginClass = module.default || Object.values(module).find(value => {
            return typeof value === 'function' && 
              value.prototype && 
              (
                value.prototype.onInitialize ||
                value.prototype.onEnable ||
                value.prototype.onDisable ||
                value.prototype.onUninstall
              );
          });
          
          if (typeof pluginClass !== 'function') {
            options.logger?.debug(`No plugin class found in ${mainFile}`);
            continue;
          }
          
          // 添加到已发现的插件列表
          discoveredPlugins.push(pluginClass as PluginConstructor);
          options.logger?.debug(`Discovered plugin in ${mainFile}`);
        } catch (error) {
          options.logger?.debug(`Error loading plugin from ${pluginDir}: ${(error as Error).message}`);
        }
      }
    } catch (error) {
      options.logger?.error(`Error reading plugins directory: ${(error as Error).message}`);
    }
    
    return discoveredPlugins;
  }
  
  /**
   * 创建插件上下文
   * @param pluginId 插件ID
   * @returns 插件上下文对象
   */
  private createPluginContext(pluginId: string): PluginContext {
    const emitter = this.registry;
    
    return {
      getPlugin: <T extends IPlugin = IPlugin>(id: string): T | undefined => {
        return this.registry.getPlugin<T>(id);
      },
      
      getConfig: <T = any>(key?: string): T => {
        const pluginConfig = this.options.config;
        if (!key) {
          return pluginConfig as unknown as T;
        }
        
        const parts = key.split('.');
        let current: any = pluginConfig;
        
        for (const part of parts) {
          if (current === undefined || current === null) {
            return undefined as unknown as T;
          }
          current = current[part];
        }
        
        return current as T;
      },
      
      getLogger: (name?: string): any => {
        const loggerName = name || pluginId;
        const base = (this.options as any).logger
        // Prefer DI logger with child() if available
        if (base && typeof (base as any).child === 'function') {
          return (base as any).child(loggerName)
        }
        
        return {
          debug: (message: string, ...args: any[]) => 
            this.options.logger.debug(`[${loggerName}] ${message}`, ...args),
          info: (message: string, ...args: any[]) => 
            this.options.logger.info(`[${loggerName}] ${message}`, ...args),
          warn: (message: string, ...args: any[]) => 
            this.options.logger.warn(`[${loggerName}] ${message}`, ...args),
          error: (message: string, ...args: any[]) => 
            this.options.logger.error(`[${loggerName}] ${message}`, ...args)
        };
      },
      
      getCache: (namespace?: string): any => {
        const cacheNamespace = namespace || `plugin:${pluginId}`;
        
        if (!this.options.cache) {
          // 如果没有提供缓存，返回无操作缓存
          return {
            get: async () => undefined,
            set: async () => {},
            has: async () => false,
            delete: async () => false,
            clear: async () => {},
            getStats: async () => ({ hits: 0, misses: 0, size: 0, keys: [] })
          };
        }
        
        return this.options.cache.withNamespace(cacheNamespace);
      },
      
      on: <T = any>(event: string, handler: (data: T) => void): () => void => {
        (emitter as any).on(event as any, handler as any);
        return () => {
          (emitter as any).removeListener(event as any, handler as any);
        };
      },
      
      emit: <T = any>(event: string, data?: T): void => {
        emitter.emit(event, data);
      }
    };
  }
  
  /**
   * 加载插件
   * 初始化已注册的插件
   * @param options 插件初始化选项
   * @returns 加载结果
   */
  async loadPlugins(options?: Record<string, PluginInitOptions>): Promise<PluginLoadResult> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const result: PluginLoadResult = {
      loadedPlugins: [],
      errors: []
    };
    
    // 按依赖顺序解析插件
    let pluginIds: string[];
    try {
      pluginIds = this.registry.resolveLoadOrder();
    } catch (error) {
      if (error instanceof PluginDependencyError) {
        result.errors.push({
          pluginId: error.pluginId,
          error
        });
        
        // 过滤掉有问题的插件及其依赖
        pluginIds = this.registry
          .getAllPluginMetadata()
          .filter(metadata => !metadata.dependencies?.includes(error.dependencyId))
          .map(metadata => metadata.id);
      } else {
        throw error;
      }
    }
    
    // 逐个初始化插件
    for (const pluginId of pluginIds) {
      // 检查是否已经实例化
      let plugin = this.registry.getPlugin(pluginId);
      const pluginClass = !plugin ? await this.getPluginClass(pluginId) : null;
      
      if (!plugin && !pluginClass) {
        this.options.logger.warn(`Plugin ${pluginId} not found`);
        continue;
      }
      
      try {
        // 如果插件未实例化，则创建实例
        if (!plugin && pluginClass) {
          plugin = new pluginClass();
          this.registry.registerPlugin(plugin);
        }
        
        // 已经初始化的插件跳过
        if (plugin!.state !== PluginState.REGISTERED) {
          continue;
        }
        
        // 创建插件上下文
        const context = this.createPluginContext(pluginId);
        
        // 初始化插件
        await plugin!.initialize(context, options?.[pluginId]);
        
        result.loadedPlugins.push(pluginId);
        this.registry.emit('initialized', plugin!.metadata);
        
        if ((plugin as IPlugin).state === PluginState.ENABLED) {
          this.registry.emit('enabled', plugin!.metadata);
        }
      } catch (error: any) {
        this.options.logger.error(`Failed to initialize plugin ${pluginId}: ${error.message}`);
        result.errors.push({
          pluginId,
          error
        });
      }
    }
    
    return result;
  }
  
  /**
   * 启用插件
   * @param pluginId 插件ID
   */
  async enablePlugin(pluginId: string): Promise<void> {
    const plugin = this.registry.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    
    // 已启用则直接返回，保持幂等
    if (plugin.state === PluginState.ENABLED) {
      return;
    }
    
    if (plugin.state !== PluginState.INITIALIZED && 
        plugin.state !== PluginState.DISABLED) {
      throw new Error(`Cannot enable plugin ${pluginId} in state ${plugin.state}`);
    }
    
    await plugin.enable();
    this.registry.emit('enabled', plugin.metadata);
  }
  
  /**
   * 禁用插件
   * @param pluginId 插件ID
   */
  async disablePlugin(pluginId: string): Promise<void> {
    const plugin = this.registry.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    
    if (plugin.state !== PluginState.ENABLED) {
      throw new Error(`Cannot disable plugin ${pluginId} in state ${plugin.state}`);
    }
    
    // 检查是否有依赖此插件的启用中插件
    const dependentIds = this.registry.getDependentPlugins(pluginId);
    for (const depId of dependentIds) {
      const depPlugin = this.registry.getPlugin(depId);
      if (depPlugin && depPlugin.state === PluginState.ENABLED) {
        throw new Error(
          `Cannot disable plugin ${pluginId} because it is required by ${depId}`
        );
      }
    }
    
    await plugin.disable();
    this.registry.emit('disabled', plugin.metadata);
  }
  
  /**
   * 卸载插件
   * @param pluginId 插件ID
   */
  async uninstallPlugin(pluginId: string): Promise<void> {
    const plugin = this.registry.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    
    // 如果插件已启用，先禁用它
    if (plugin.state === PluginState.ENABLED) {
      await this.disablePlugin(pluginId);
    }
    
    // 卸载插件
    await plugin.uninstall();
    
    // 从注册表中移除
    this.registry.unregisterPlugin(pluginId);
  }
  
  /**
   * 获取插件类
   * @param pluginId 插件ID
   */
  private async getPluginClass(pluginId: string): Promise<PluginConstructor | undefined> {
    const metadata = this.registry.getPluginMetadata(pluginId);
    if (!metadata) {
      return undefined;
    }
    
    // 通过显式的API获取构造函数
    return this.registry.getPluginConstructor(pluginId);
  }
  
  /**
   * 获取插件注册表
   * @returns 插件注册表实例
   */
  getRegistry(): PluginRegistry {
    return this.registry;
  }
  
  /**
   * 获取已启用的插件
   * @returns 已启用的插件列表
   */
  getEnabledPlugins(): IPlugin[] {
    return this.registry
      .getAllPlugins()
      .filter(plugin => plugin.state === PluginState.ENABLED);
  }
} 