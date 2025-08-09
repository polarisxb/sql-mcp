/**
 * 配置系统导出文件
 * 集中导出所有配置相关的类型和函数
 */

export * from './defaults.js';
export * from './schema.js';
export * from './loader.js';

import { DEFAULT_CONFIG } from './defaults.js';
import { ConfigLoader } from './loader.js';
import { ValidatedAppConfig } from './schema.js';

/**
 * 获取应用配置实例
 * 根据当前环境加载合适的配置
 */
export function loadConfig(options: {
  configPath?: string;
  envPrefix?: string;
  loadEnv?: boolean;
} = {}): ValidatedAppConfig {
  const {
    configPath,
    loadEnv = true
  } = options;
  
  const configLoader = new ConfigLoader(DEFAULT_CONFIG);
  
  // 加载环境变量
  if (loadEnv) {
    configLoader.loadFromEnv();
  }
  
  // 加载配置文件
  if (configPath) {
    configLoader.loadFromFile(configPath);
  }
  
  // 获取并验证配置
  return configLoader.getValidatedConfig();
} 