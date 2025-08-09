import { BasePlugin, PluginMetadata } from '../interface.js';

/**
 * 示例插件
 * 展示如何创建一个基本的插件
 */
export class ExamplePlugin extends BasePlugin {
  constructor() {
    // 定义插件元数据
    super({
      id: 'example-plugin',
      name: 'Example Plugin',
      version: '1.0.0',
      description: '一个示例插件，展示插件系统的基本用法',
      author: 'SQL-MCP Team',
      // 加载顺序（越小越先加载）
      loadOrder: 100,
      // 自动启用
      autoEnable: true
    });
  }

  /**
   * 初始化插件
   * 在插件首次加载时调用
   */
  protected async onInitialize(): Promise<void> {
    // 获取日志实例
    const logger = this.context.getLogger();
    logger.info('示例插件初始化中...');

    // 读取插件配置
    const config = this.getConfig();
    logger.debug('配置信息:', config);
  }

  /**
   * 启用插件
   * 当插件被启用时调用
   */
  protected async onEnable(): Promise<void> {
    const logger = this.context.getLogger();
    logger.info('示例插件已启用');

    // 注册事件监听
    this.context.on('some-event', (data) => {
      logger.info('接收到事件:', data);
    });

    // 使用缓存
    const cache = this.context.getCache();
    await cache.set('example-key', 'example-value');
    
    // 触发事件
    this.context.emit('plugin-enabled', { 
      pluginId: this.metadata.id,
      timestamp: new Date()
    });
  }

  /**
   * 禁用插件
   * 当插件被禁用时调用
   */
  protected async onDisable(): Promise<void> {
    const logger = this.context.getLogger();
    logger.info('示例插件已禁用');
    
    // 清理缓存
    const cache = this.context.getCache();
    await cache.clear();
  }

  /**
   * 卸载插件
   * 当插件被卸载时调用
   */
  protected async onUninstall(): Promise<void> {
    const logger = this.context.getLogger();
    logger.info('示例插件已卸载，清理资源');
  }

  /**
   * 获取插件API
   * 提供给其他插件使用的接口
   */
  getApi(): Record<string, any> {
    return {
      // 公开的方法和属性
      greet: (name: string) => `Hello, ${name}! This is Example Plugin.`,
      pluginInfo: {
        name: this.metadata.name,
        version: this.metadata.version,
        author: this.metadata.author
      }
    };
  }
}