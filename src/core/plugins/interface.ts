/**
 * 插件元数据接口
 * 描述插件的基本信息和元数据
 */
export interface PluginMetadata {
  /**
   * 插件唯一标识符
   */
  id: string;
  
  /**
   * 插件名称
   */
  name: string;
  
  /**
   * 插件版本
   */
  version: string;
  
  /**
   * 插件描述
   */
  description?: string;
  
  /**
   * 插件作者
   */
  author?: string;
  
  /**
   * 插件依赖列表，包含依赖的其他插件ID
   */
  dependencies?: string[];
  
  /**
   * 插件标签，用于分类和筛选
   */
  tags?: string[];
  
  /**
   * 插件首选的加载顺序（数字越小越先加载）
   */
  loadOrder?: number;
  
  /**
   * 是否在初始化后自动启用插件
   */
  autoEnable?: boolean;
}

/**
 * 插件上下文接口
 * 提供插件运行时的上下文信息和工具
 */
export interface PluginContext {
  /**
   * 获取其他已注册的插件
   * @param id 插件ID
   * @returns 找到的插件实例或undefined
   */
  getPlugin: <T extends IPlugin = IPlugin>(id: string) => T | undefined;
  
  /**
   * 获取配置信息
   * @param key 配置键名，如果省略则获取整个配置
   * @returns 配置值
   */
  getConfig: <T = any>(key?: string) => T;
  
  /**
   * 获取日志实例
   * @param name 日志名称，默认为插件ID
   * @returns 日志接口
   */
  getLogger: (name?: string) => {
    debug: (message: string, ...args: any[]) => void;
    info: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
  };
  
  /**
   * 获取缓存实例
   * @param namespace 缓存命名空间，默认为插件ID
   * @returns 缓存接口
   */
  getCache: (namespace?: string) => any;
  
  /**
   * 注册事件处理程序
   * @param event 事件名称
   * @param handler 事件处理函数
   * @returns 注销函数
   */
  on: <T = any>(event: string, handler: (data: T) => void) => () => void;
  
  /**
   * 触发事件
   * @param event 事件名称
   * @param data 事件数据
   */
  emit: <T = any>(event: string, data?: T) => void;
}

/**
 * 插件初始化选项接口
 * 初始化插件时提供的配置和选项
 */
export interface PluginInitOptions {
  /**
   * 插件特定的配置选项
   */
  config?: Record<string, any>;
  
  /**
   * 是否强制启用插件
   */
  forceEnable?: boolean;
}

/**
 * 插件状态枚举
 * 定义插件的生命周期状态
 */
export enum PluginState {
  /** 已注册但未初始化 */
  REGISTERED = 'registered',
  /** 已初始化但未启用 */
  INITIALIZED = 'initialized',
  /** 已启用且运行中 */
  ENABLED = 'enabled',
  /** 已禁用 */
  DISABLED = 'disabled',
  /** 发生错误 */
  ERROR = 'error'
}

/**
 * 插件接口
 * 定义所有插件必须实现的方法和属性
 */
export interface IPlugin {
  /**
   * 插件元数据
   */
  readonly metadata: PluginMetadata;
  
  /**
   * 插件当前状态
   */
  readonly state: PluginState;
  
  /**
   * 插件出错时的错误信息
   */
  readonly error?: Error;
  
  /**
   * 初始化插件
   * 在插件首次加载时调用，用于设置初始状态
   * @param context 插件上下文
   * @param options 初始化选项
   */
  initialize(context: PluginContext, options?: PluginInitOptions): Promise<void>;
  
  /**
   * 启用插件
   * 激活插件功能并开始工作
   */
  enable(): Promise<void>;
  
  /**
   * 禁用插件
   * 停用插件功能但不完全卸载
   */
  disable(): Promise<void>;
  
  /**
   * 卸载插件
   * 完全清理插件资源并准备移除
   */
  uninstall(): Promise<void>;
  
  /**
   * 获取插件API
   * 返回插件暴露给其他插件的API
   * @returns 插件API对象
   */
  getApi(): Record<string, any>;
  
  /**
   * 获取插件特定配置项
   * @param key 配置键
   * @returns 配置值
   */
  getConfig<T = any>(key?: string): T;
}

/**
 * 抽象插件基类
 * 提供插件接口的基本实现，减少重复代码
 */
export abstract class BasePlugin implements IPlugin {
  /** 插件元数据 */
  readonly metadata: PluginMetadata;
  
  /** 当前状态 */
  protected _state: PluginState = PluginState.REGISTERED;
  
  /** 错误信息 */
  protected _error?: Error;
  
  /** 插件上下文 */
  protected context!: PluginContext;
  
  /** 插件配置 */
  protected config: Record<string, any> = {};
  
  /**
   * 构造插件实例
   * @param metadata 插件元数据
   */
  constructor(metadata: PluginMetadata) {
    this.metadata = {
      loadOrder: 100, // 默认加载顺序
      autoEnable: true, // 默认自动启用
      ...metadata
    };
  }
  
  /** 获取插件状态 */
  get state(): PluginState {
    return this._state;
  }
  
  /** 获取错误信息 */
  get error(): Error | undefined {
    return this._error;
  }
  
  /** 
   * 初始化插件
   * 设置插件上下文和配置
   */
  async initialize(context: PluginContext, options?: PluginInitOptions): Promise<void> {
    this.context = context;
    
    // 合并配置
    if (options?.config) {
      this.config = {
        ...this.config,
        ...options.config
      };
    }
    
    try {
      // 调用子类的实际初始化逻辑
      await this.onInitialize();
      this._state = PluginState.INITIALIZED;
      
      // 如果需要自动启用
      if (this.metadata.autoEnable || options?.forceEnable) {
        await this.enable();
      }
    } catch (error: any) {
      this._error = error;
      this._state = PluginState.ERROR;
      throw error;
    }
  }
  
  /** 
   * 启用插件
   * 激活插件功能
   */
  async enable(): Promise<void> {
    if (this._state === PluginState.ENABLED) {
      return; // 已经启用
    }
    
    if (this._state !== PluginState.INITIALIZED && 
        this._state !== PluginState.DISABLED) {
      throw new Error(`Cannot enable plugin ${this.metadata.id} in state ${this._state}`);
    }
    
    try {
      // 调用子类的启用逻辑
      await this.onEnable();
      this._state = PluginState.ENABLED;
    } catch (error: any) {
      this._error = error;
      this._state = PluginState.ERROR;
      throw error;
    }
  }
  
  /** 
   * 禁用插件
   * 停用插件功能
   */
  async disable(): Promise<void> {
    if (this._state === PluginState.DISABLED) {
      return; // 已经禁用
    }
    
    if (this._state !== PluginState.ENABLED) {
      throw new Error(`Cannot disable plugin ${this.metadata.id} in state ${this._state}`);
    }
    
    try {
      // 调用子类的禁用逻辑
      await this.onDisable();
      this._state = PluginState.DISABLED;
    } catch (error: any) {
      this._error = error;
      this._state = PluginState.ERROR;
      throw error;
    }
  }
  
  /** 
   * 卸载插件
   * 清理资源
   */
  async uninstall(): Promise<void> {
    try {
      // 如果插件已启用，先禁用它
      if (this._state === PluginState.ENABLED) {
        await this.disable();
      }
      
      // 调用子类的卸载逻辑
      await this.onUninstall();
    } catch (error: any) {
      this._error = error;
      this._state = PluginState.ERROR;
      throw error;
    }
  }
  
  /**
   * 获取插件API
   * 默认返回空对象，子类可重写
   */
  getApi(): Record<string, any> {
    return {};
  }
  
  /**
   * 获取插件配置
   * @param key 配置键，如果省略则返回整个配置
   */
  getConfig<T = any>(key?: string): T {
    if (key) {
      return this.config[key] as T;
    }
    return this.config as unknown as T;
  }
  
  // 以下方法由子类实现
  
  /**
   * 子类初始化实现
   * 当插件被初始化时调用
   */
  protected abstract onInitialize(): Promise<void>;
  
  /**
   * 子类启用实现
   * 当插件被启用时调用
   */
  protected abstract onEnable(): Promise<void>;
  
  /**
   * 子类禁用实现
   * 当插件被禁用时调用
   */
  protected abstract onDisable(): Promise<void>;
  
  /**
   * 子类卸载实现
   * 当插件被卸载时调用
   */
  protected abstract onUninstall(): Promise<void>;
}

/**
 * 插件构造函数类型
 */
export type PluginConstructor = new (...args: any[]) => IPlugin; 