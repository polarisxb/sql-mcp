import { EventEmitter } from 'events';
import { IPlugin, PluginConstructor, PluginMetadata, PluginState } from './interface.js';

/**
 * 插件注册表事件类型
 */
export type PluginRegistryEvent = 
  | 'registered'   // 插件注册事件
  | 'unregistered' // 插件注销事件
  | 'initialized'  // 插件初始化事件
  | 'enabled'      // 插件启用事件
  | 'disabled'     // 插件禁用事件
  | 'error';       // 插件错误事件

/**
 * 插件注册表错误类
 */
export class PluginRegistryError extends Error {
  /**
   * 构造函数
   * @param message 错误信息
   * @param pluginId 相关的插件ID
   */
  constructor(
    message: string, 
    public readonly pluginId?: string
  ) {
    super(message);
    this.name = 'PluginRegistryError';
  }
}

/**
 * 插件依赖错误类
 */
export class PluginDependencyError extends PluginRegistryError {
  /**
   * 构造函数
   * @param message 错误信息
   * @param pluginId 插件ID
   * @param dependencyId 依赖的插件ID
   */
  constructor(
    message: string, 
    public readonly pluginId: string,
    public readonly dependencyId: string
  ) {
    super(message, pluginId);
    this.name = 'PluginDependencyError';
  }
}

/**
 * 插件注册表
 * 管理插件的注册、查找和生命周期
 */
export class PluginRegistry extends EventEmitter {
  /**
   * 存储已注册的插件实例
   * 键是插件ID，值是插件实例
   */
  private plugins = new Map<string, IPlugin>();
  
  /**
   * 存储插件类构造函数
   * 键是插件ID，值是插件类
   */
  private pluginConstructors = new Map<string, PluginConstructor>();
  
  /**
   * 存储插件元数据
   * 键是插件ID，值是元数据
   */
  private pluginMetadata = new Map<string, PluginMetadata>();
  
  /**
   * 存储插件依赖图
   * 键是插件ID，值是依赖它的插件ID数组
   */
  private dependencyGraph = new Map<string, string[]>();
  
  /**
   * 构造函数
   */
  constructor() {
    super();
    
    // 设置最大监听器数量，避免警告
    this.setMaxListeners(100);
  }
  
  /**
   * 注册插件类
   * @param pluginClass 插件类
   * @returns 注册后的插件元数据
   * @throws 如果插件已注册或ID无效
   */
  registerPluginClass(pluginClass: PluginConstructor): PluginMetadata {
    // 创建临时实例获取元数据
    const tempInstance = new pluginClass();
    const metadata = tempInstance.metadata;
    
    if (!metadata.id) {
      throw new PluginRegistryError('Plugin ID is required');
    }
    
    if (this.hasPlugin(metadata.id)) {
      throw new PluginRegistryError(`Plugin ${metadata.id} is already registered`, metadata.id);
    }
    
    // 保存构造函数和元数据
    this.pluginConstructors.set(metadata.id, pluginClass);
    this.pluginMetadata.set(metadata.id, metadata);
    
    // 更新依赖图
    if (metadata.dependencies?.length) {
      for (const depId of metadata.dependencies) {
        if (!this.dependencyGraph.has(depId)) {
          this.dependencyGraph.set(depId, []);
        }
        
        this.dependencyGraph.get(depId)!.push(metadata.id);
      }
    }
    
    // 触发注册事件
    this.emit('registered', metadata);
    
    return metadata;
  }
  
  /**
   * 注册插件实例
   * @param plugin 插件实例
   * @returns 注册的插件实例
   * @throws 如果插件已注册或ID无效
   */
  registerPlugin(plugin: IPlugin): IPlugin {
    const metadata = plugin.metadata;
    
    if (!metadata.id) {
      throw new PluginRegistryError('Plugin ID is required');
    }
    
    // 仅当同名实例已存在时阻止注册
    if (this.plugins.has(metadata.id)) {
      throw new PluginRegistryError(`Plugin ${metadata.id} is already registered`, metadata.id);
    }
    
    // 保存插件实例和元数据
    this.plugins.set(metadata.id, plugin);
    this.pluginMetadata.set(metadata.id, metadata);
    
    // 更新依赖图
    if (metadata.dependencies?.length) {
      for (const depId of metadata.dependencies) {
        if (!this.dependencyGraph.has(depId)) {
          this.dependencyGraph.set(depId, []);
        }
        
        this.dependencyGraph.get(depId)!.push(metadata.id);
      }
    }
    
    // 触发注册事件
    this.emit('registered', metadata);
    
    return plugin;
  }
  
  /**
   * 注销插件
   * @param id 插件ID
   * @returns 是否成功注销
   */
  unregisterPlugin(id: string): boolean {
    if (!this.hasPlugin(id)) {
      return false;
    }
    
    // 检查是否有其他插件依赖此插件
    const dependents = this.dependencyGraph.get(id) || [];
    if (dependents.length > 0) {
      const activeDependent = dependents.find(depId => {
        const plugin = this.plugins.get(depId);
        return plugin && plugin.state === PluginState.ENABLED;
      });
      
      if (activeDependent) {
        throw new PluginRegistryError(
          `Cannot unregister plugin ${id} because it is required by ${activeDependent}`,
          id
        );
      }
    }
    
    // 从注册表中移除
    const metadata = this.pluginMetadata.get(id);
    this.plugins.delete(id);
    this.pluginConstructors.delete(id);
    this.pluginMetadata.delete(id);
    
    // 从依赖图中移除
    this.dependencyGraph.delete(id);
    for (const [depId, deps] of this.dependencyGraph.entries()) {
      this.dependencyGraph.set(
        depId,
        deps.filter(pid => pid !== id)
      );
    }
    
    // 触发注销事件
    if (metadata) {
      this.emit('unregistered', metadata);
    }
    
    return true;
  }
  
  /**
   * 获取插件实例
   * @param id 插件ID
   * @returns 插件实例或undefined
   */
  getPlugin<T extends IPlugin = IPlugin>(id: string): T | undefined {
    return this.plugins.get(id) as T | undefined;
  }
  
  /**
   * 获取插件元数据
   * @param id 插件ID
   * @returns 插件元数据或undefined
   */
  getPluginMetadata(id: string): PluginMetadata | undefined {
    return this.pluginMetadata.get(id);
  }
  
  /**
   * 获取插件构造函数
   * @param id 插件ID
   * @returns 插件构造函数或undefined
   */
  getPluginConstructor(id: string): PluginConstructor | undefined {
    return this.pluginConstructors.get(id);
  }
  
  /**
   * 检查插件是否已注册
   * @param id 插件ID
   * @returns 是否已注册
   */
  hasPlugin(id: string): boolean {
    return this.plugins.has(id) || this.pluginConstructors.has(id);
  }
  
  /**
   * 获取所有已注册插件的元数据
   * @returns 插件元数据数组
   */
  getAllPluginMetadata(): PluginMetadata[] {
    return Array.from(this.pluginMetadata.values());
  }
  
  /**
   * 获取所有已注册的插件实例
   * @returns 插件实例数组
   */
  getAllPlugins(): IPlugin[] {
    return Array.from(this.plugins.values());
  }
  
  /**
   * 获取依赖于指定插件的插件ID
   * @param id 插件ID
   * @returns 依赖于此插件的插件ID数组
   */
  getDependentPlugins(id: string): string[] {
    return this.dependencyGraph.get(id) || [];
  }
  
  /**
   * 计算插件的依赖顺序
   * 按照依赖关系和loadOrder排序
   * @returns 按正确顺序排列的插件ID数组
   */
  resolveLoadOrder(): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    // 获取所有注册的插件ID
    const pluginIds = Array.from(this.pluginMetadata.keys());
    
    // 按loadOrder排序
    const sortedIds = pluginIds.sort((a, b) => {
      const metadataA = this.pluginMetadata.get(a);
      const metadataB = this.pluginMetadata.get(b);
      
      const orderA = metadataA?.loadOrder ?? 100;
      const orderB = metadataB?.loadOrder ?? 100;
      
      return orderA - orderB;
    });
    
    // 深度优先搜索解决依赖顺序
    const visit = (id: string): void => {
      // 已处理过的节点
      if (visited.has(id)) {
        return;
      }
      
      // 检测循环依赖
      if (visiting.has(id)) {
        throw new PluginRegistryError(`Circular dependency detected for plugin ${id}`, id);
      }
      
      // 标记为正在访问
      visiting.add(id);
      
      // 先访问依赖
      const metadata = this.pluginMetadata.get(id);
      if (metadata?.dependencies?.length) {
        for (const depId of metadata.dependencies) {
          // 确保依赖存在
          if (!this.hasPlugin(depId)) {
            throw new PluginDependencyError(
              `Plugin ${id} depends on ${depId}, which is not registered`,
              id,
              depId
            );
          }
          
          visit(depId);
        }
      }
      
      // 标记为已访问并添加到结果
      visiting.delete(id);
      visited.add(id);
      result.push(id);
    };
    
    // 访问所有插件
    for (const id of sortedIds) {
      visit(id);
    }
    
    return result;
  }
  
  /**
   * 监听插件注册表事件
   * @param event 事件类型
   * @param listener 监听器函数
   * @returns this，支持链式调用
   */
  on(event: PluginRegistryEvent, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }
  
  /**
   * 注册事件监听器
   * @param event 事件类型
   * @param listener 监听器函数
   * @returns this，支持链式调用
   */
  addListener(event: PluginRegistryEvent, listener: (...args: any[]) => void): this {
    return super.addListener(event, listener);
  }
  
  /**
   * 移除事件监听器
   * @param event 事件类型
   * @param listener 监听器函数
   * @returns this，支持链式调用
   */
  removeListener(event: PluginRegistryEvent, listener: (...args: any[]) => void): this {
    return super.removeListener(event, listener);
  }
  
  /**
   * 清空注册表
   * 移除所有插件
   */
  clear(): void {
    this.plugins.clear();
    this.pluginConstructors.clear();
    this.pluginMetadata.clear();
    this.dependencyGraph.clear();
  }
} 