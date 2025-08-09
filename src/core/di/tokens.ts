/**
 * DI 依赖标识符 (Tokens)
 * 
 * 使用 Symbol 作为依赖注入的标识符是一种最佳实践，
 * 它可以避免在大型应用中因字符串键可能导致的命名冲突。
 * 每个 Symbol 都是唯一的。
 */

// --- 核心服务标识符 ---

/**
 * @token METADATA_SERVICE
 * @description 负责从数据库提取和缓存元数据（如表结构、索引等）的服务。
 */
export const METADATA_SERVICE = Symbol('METADATA_SERVICE');

/**
 * @token SAMPLER_SERVICE
 * @description 负责从表中进行数据采样的服务。
 */
export const SAMPLER_SERVICE = Symbol('SAMPLER_SERVICE');

/**
 * @token SECURITY_SERVICE
 * @description (规划中) 负责处理权限验证、SQL注入防护等安全相关事宜的服务。
 */
export const SECURITY_SERVICE = Symbol('SECURITY_SERVICE');

/**
 * @token CACHE_SERVICE
 * @description (规划中) 提供通用缓存能力的服务，可用于缓存查询结果或元数据。
 */
export const CACHE_SERVICE = Symbol('CACHE_SERVICE');

/**
 * @token LOGGER_SERVICE
 * @description 提供日志记录功能的服务，用于记录应用运行状态、错误等。
 */
export const LOGGER_SERVICE = Symbol('LOGGER_SERVICE');


// --- 数据库连接器相关标识符 ---

/**
 * @token DATABASE_CONNECTOR
 * @description 代表当前激活的数据库连接器实例。
 * @see {@link import('@core/types/connector').DatabaseConnector}
 */
export const DATABASE_CONNECTOR = Symbol('DATABASE_CONNECTOR');

/**
 * @token CONNECTOR_FACTORY
 * @description 一个工厂函数，能够根据数据库类型创建对应的连接器实例。
 * @type {(type: import('@core/types/database').DatabaseType) => import('@core/types/connector').DatabaseConnector}
 */
export const CONNECTOR_FACTORY = Symbol('CONNECTOR_FACTORY');


// --- 配置相关标识符 ---

/**
 * @token CONFIG_LOADER
 * @description (规划中) 负责从文件或环境变量加载应用配置的服务。
 */
export const CONFIG_LOADER = Symbol('CONFIG_LOADER');

/**
 * @token APP_CONFIG
 * @description 代表应用当前加载的配置对象。
 */
export const APP_CONFIG = Symbol('APP_CONFIG');


// --- 插件系统标识符 ---

/**
 * @token PLUGIN_REGISTRY
 * @description (规划中) 负责注册和管理插件的中心服务。
 */
export const PLUGIN_REGISTRY = Symbol('PLUGIN_REGISTRY');

/**
 * @token PLUGIN_LOADER
 * @description (规划中) 负责加载和初始化已注册插件的服务。
 */
export const PLUGIN_LOADER = Symbol('PLUGIN_LOADER');


// --- MCP协议相关标识符 ---

/**
 * @token MCP_SERVER
 * @description 代表 MCP 服务器的核心实例。
 */
export const MCP_SERVER = Symbol('MCP_SERVER');

/**
 * @token MCP_TRANSPORT
 * @description 代表 MCP 的传输层实例 (例如 Stdio, HTTP)。
 */
export const MCP_TRANSPORT = Symbol('MCP_TRANSPORT'); 