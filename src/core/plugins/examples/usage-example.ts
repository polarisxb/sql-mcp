import { createPluginSystem } from '../index.js';
import { ExamplePlugin } from './example-plugin.js';
import { IPlugin } from '../interface.js';

/**
 * 示例：初始化和使用插件系统
 */
async function main() {
  console.log('初始化插件系统...');

  // 创建插件系统
  const pluginSystem = createPluginSystem({
    // 指定插件目录
    pluginsDir: './plugins',
    // 自动发现插件
    autoDiscovery: true,
    // 内置插件
    builtinPlugins: [ExamplePlugin],
    // 全局配置（提供必要字段以满足类型）
    config: {
      database: {
        /* 数据库配置 */
        type: 'mysql' as any,
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'test',
        connectionTimeout: 10000
      },
      cache: { enabled: true, ttl: 3600, storage: 'memory', maxSize: 100, filePath: null as any },
      security: { readOnly: true, sensitiveFields: ['password'], maxQueryLength: 10000 },
      logging: { level: 'info', destination: 'console', filePath: '' },
      mcp: { transport: 'stdio', httpPort: null as any, serverName: 'example', serverVersion: '1.0.0' }
    } as any,
    // 日志配置
    logger: {
      debug: (...args) => console.debug('[DEBUG]', ...args),
      info: (...args) => console.info('[INFO]', ...args),
      warn: (...args) => console.warn('[WARN]', ...args),
      error: (...args) => console.error('[ERROR]', ...args)
    }
  });

  // 初始化插件系统
  const result = await pluginSystem.initialize();
  
  console.log('插件系统初始化完成');
  console.log(`已加载插件: ${result.loadedPlugins.length}个`);
  
  if (result.errors.length > 0) {
    console.error('插件加载错误:', result.errors);
  }

  // 访问注册表获取已加载的插件
  const plugins = pluginSystem.registry.getAllPlugins();
  
  console.log('已注册的插件:');
  for (const plugin of plugins) {
    console.log(`- ${plugin.metadata.name} (${plugin.metadata.id}): ${plugin.state}`);
  }

  // 通过ID获取指定插件
  const examplePlugin = pluginSystem.registry.getPlugin<ExamplePlugin>('example-plugin');
  
  if (examplePlugin) {
    // 调用插件API
    const api = examplePlugin.getApi();
    const greeting = api.greet('User');
    console.log(greeting);
    console.log('插件信息:', api.pluginInfo);
  }

  // 使用插件触发事件
  pluginSystem.registry.emit('some-event', { message: '这是一个测试事件' });

  // 获取所有启用的插件
  const enabledPlugins = pluginSystem.loader.getEnabledPlugins();
  console.log(`启用的插件数量: ${enabledPlugins.length}`);

  // 禁用插件示例
  if (examplePlugin && examplePlugin.state === 'enabled') {
    console.log('正在禁用示例插件...');
    await pluginSystem.loader.disablePlugin('example-plugin');
    console.log('示例插件已禁用');
  }

  // 重新启用插件
  if (examplePlugin && examplePlugin.state === 'disabled') {
    console.log('正在重新启用示例插件...');
    await pluginSystem.loader.enablePlugin('example-plugin');
    console.log('示例插件已重新启用');
  }
}

// 运行示例
if (require.main === module) {
  main().catch(err => {
    console.error('插件系统示例运行失败:', err);
    process.exit(1);
  });
}

// 导出示例函数以便在其他地方使用
export { main as runPluginSystemExample }; 