# SQL-MCP

[![CI](https://github.com/polarisxb/sql-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/polarisxb/sql-mcp/actions/workflows/ci.yml)
[![Docker](https://github.com/polarisxb/sql-mcp/actions/workflows/docker.yml/badge.svg)](https://github.com/polarisxb/sql-mcp/actions/workflows/docker.yml)
[![npm version](https://img.shields.io/npm/v/%40polarisxb%2Fsql-mcp.svg)](https://www.npmjs.com/package/@polarisxb/sql-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/polarisxb/sql-mcp)

**SQL-MCP** 是一个实现了模型上下文协议 (Model Context Protocol, MCP) 的服务器，其核心功能是作为连接大型语言模型 (LLM) 与数据库的桥梁。它允许 LLM 安全、高效地访问数据库信息，包括进行**元数据查询**、**数据采样**和**只读SQL查询**。

本项目当前主要支持 **MySQL**，并提供 **Stdio** 和 **HTTP** 两种灵活的传输方式，既可以作为独立的 HTTP 服务运行，也可以轻松集成到其他开发工具链中。

如需英文版本，请参阅 [README.en.md](README.en.md)。

---

## ✨ 功能特性

-   **元数据查询**: 详细查询数据库、表、列、索引、外键等元信息。
-   **数据采样**: 安全地获取表的示例数据，支持分页和自动脱敏。
-   **只读查询**: 严格限制执行 `SELECT` 和 `SHOW` 等只读 SQL，保障数据安全。
-   **快速检索**: 提供 `searchTables` 和 `searchColumns` 接口，用于快速查找表和列。
-   **缓存管理**: 支持手动刷新元数据缓存，确保大模型获取的信息实时准确。
-   **安全可靠**: 内置 API Key 认证、CORS 控制、IP 限流等多重安全机制。

---

## 🚀 快速开始

### 1. 安装

您可以选择通过 `npm` 全局安装，或从源码克隆后构建。

**全局安装 (推荐)**:

```bash
npm i -g @polarisxb/sql-mcp
```

**从源码构建**:

```bash
git clone https://github.com/polarisxb/sql-mcp.git
cd sql-mcp
npm ci
npm run build
```

### 2. 启动服务

根据您的使用场景，选择合适的启动方式。

**通过 Stdio (标准输入/输出)**:

此方式适合在 **Cursor** 或其他支持命令式 MCP 的工具中进行本地集成。

```bash
sql-mcp --type mysql \
  --host 127.0.0.1 --port 3306 \
  --user root --password your_password --database your_db \
  --transport stdio
```

**通过 HTTP**:

将 SQL-MCP 作为独立的 HTTP 服务运行，供远程应用调用。

```bash
sql-mcp --type mysql \
  --host 127.0.0.1 --port 3306 \
  --user root --password your_password --database your_db \
  --transport http --httpPort 3000
```

服务将在 `http://127.0.0.1:3000/mcp` 提供 API 端点。

### 3. Demo 快速体验（MySQL + 示例电商库）

```bash
# 启动（首次会自动初始化示例库 mydb）
docker compose up -d

# 健康检查（应返回 200）
curl -i http://127.0.0.1:3001/health
```

- 说明：`mysql:8` 暴露 3306，`sql-mcp` 暴露为 `http://127.0.0.1:3001/mcp`。
- 如端口被占用，可在 `docker-compose.yml` 中调整端口映射。

### 4. 使用 DSN 启动（本地 CLI）

```bash
# 本地构建版（支持 --dsn）
npm run build
node dist/cli.js --transport stdio --dsn "mysql://root:root@127.0.0.1:3306/mydb"

# 已发布包（npx，不支持 --dsn，用显式参数）
npx -y @polarisxb/sql-mcp --transport stdio \
  --type mysql --host 127.0.0.1 --port 3306 \
  --user root --password root --database mydb
```

### 5. MCP Inspector 调试

```bash
npx -y @modelcontextprotocol/inspector
```
- 连接 HTTP：选择 “Connect to HTTP server”，填 `http://127.0.0.1:3001/mcp`
- 启动本地进程（stdio）：选择 “Launch a process”，填写命令和参数（同上）
- 常用工具：`listTables`、`getTableSchema`、`getSampleData`、`executeQuery`、`searchTables`、`searchColumns`

---

## 🔌 Cursor 集成

在 Cursor 中，通过配置 `mcp.json` 文件即可轻松集成 SQL-MCP。

**配置文件路径**:

-   **Windows**: `%USERPROFILE%\\.cursor\\mcp.json`
-   **macOS/Linux**: `~/.cursor/mcp.json`

### Stdio 模式 (推荐)

这是最简单直接的集成方式，无需手动启动服务。

**使用 npx (无需全局安装)**:

```json
{
  "mcpServers": {
    "sql-mcp-server": {
      "command": "npx",
      "args": ["-y", "@polarisxb/sql-mcp"],
      "env": {
        "SQL_MCP_DB_TYPE": "mysql",
        "SQL_MCP_DB_HOST": "127.0.0.1",
        "SQL_MCP_DB_PORT": "3306",
        "SQL_MCP_DB_USER": "root",
        "SQL_MCP_DB_PASSWORD": "your_password",
        "SQL_MCP_DB_NAME": "your_database",
        "SQL_MCP_LOG_LEVEL": "warn"
      }
    }
  }
}
```

**从源码运行 (供开发者)**:

如果您想使用开发中的版本，可以配置从项目目录启动。

```json
{
  "mcpServers": {
    "sql-mcp-dev": {
      "command": "node",
      "args": [
        "C:/path/to/your/sql-mcp/dist/cli.js", 
        "--transport", "stdio"
      ],
      "env": {
        "SQL_MCP_DB_HOST": "127.0.0.1"
      }
    }
  }
}
```

### HTTP 模式

如果您已将 SQL-MCP 作为独立的 HTTP 服务运行，可以在 Cursor 中通过 URL 连接。

```json
{
  "mcpServers": {
    "sql-mcp-http": {
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

---

## ⚙️ 配置选项

SQL-MCP 支持通过**命令行参数**、**环境变量**和**配置文件**进行配置。

**配置优先级**: **命令行参数 > 环境变量 > 配置文件**。

### 命令行参数

以下为常用的命令行参数：

| 选项 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `--type` | string | `mysql` | 数据库类型 (当前仅支持 `mysql`) |
| `--host` | string | `127.0.0.1` | 数据库主机 |
| `--port` | number | `3306` | 数据库端口 |
| `--user` | string | - | 数据库用户名 (建议使用只读权限) |
| `--password` | string | - | 数据库密码 |
| `--database` | string | - | 默认数据库 |
| `--transport`| enum | `stdio` | 传输模式 (`stdio` 或 `http`) |
| `--httpPort` | number | `3000` | HTTP 服务的端口 |
| `--verbose` | flag | `false` | 输出详细的 `debug` 日志 |
| `--log-dest` | enum | `console` | 日志输出位置 (`console` 或 `file`) |
| `--log-file` | string | - | 日志文件路径 (当 `log-dest` 为 `file` 时) |
| `--stdio-safe`| flag | `false`| Stdio 安全预设：优化日志，精简输出 |
| `--compact`| flag | `false`| 紧凑输出，减少 Markdown 体积 |
| `--json-only`| flag | `false`| 仅输出 JSON 内容，无 Markdown 渲染 |

### 环境变量

所有配置项都可以通过前缀为 `SQL_MCP_` 的环境变量进行设置。例如, `--host` 对应的环境变量为 `SQL_MCP_DB_HOST`。

复制 `ENV.example` 文件为 `.env` 并填入您的数据库连接信息，是快速开始的好方法。

#### 环境变量对照表

| 环境变量 | 默认值 | 说明 |
|---|---|---|
| **数据库连接** | | |
| `SQL_MCP_DB_TYPE` | `mysql` | 数据库类型 |
| `SQL_MCP_DB_HOST` | `127.0.0.1` | 主机 |
| `SQL_MCP_DB_PORT` | `3306` | 端口 |
| `SQL_MCP_DB_USER` | - | 用户 |
| `SQL_MCP_DB_PASSWORD` | - | 密码 |
| `SQL_MCP_DB_NAME` | - | 数据库名 |
| `SQL_MCP_DB_TIMEOUT` | `10000` | 连接超时 (ms) |
| `SQL_MCP_DB_POOL_CONNECTION_LIMIT` | `10` | 连接池最大连接数 |
| `SQL_MCP_DB_POOL_QUEUE_LIMIT` | `0` | 等待队列上限 (`0`=无限) |
| **日志** | | |
| `SQL_MCP_LOG_LEVEL` | `info` | 日志级别: `debug\|info\|warn\|error` |
| `SQL_MCP_LOG_DESTINATION` | `console` | 日志目的地: `console\|file` |
| `SQL_MCP_LOG_FILE_PATH` | - | 文件路径 (当目的地为 `file`) |
| `SQL_MCP_LOG_SLOW_QUERY_MS` | `1000` | 慢查询阈值 (ms) |
| `SQL_MCP_LOG_HTTP_REQUESTS` | `true` | 是否记录 HTTP 请求日志 |
| **服务与安全** | | |
| `SQL_MCP_MCP_TRANSPORT` | `stdio` | MCP 传输: `stdio\|http` |
| `SQL_MCP_MCP_HTTP_PORT` | `3000` | HTTP 端口 |
| `SQL_MCP_MCP_HTTP_API_KEY` | - | 单个 API Key |
| `SQL_MCP_MCP_HTTP_API_KEYS` | - | 多个 API Key，逗号分隔 |
| `SQL_MCP_MCP_ENABLE_DNS_REBINDING_PROTECTION` | `false` | 启用 Host 校验 |
| `SQL_MCP_MCP_CORS_ALLOWED_ORIGINS` | - | 允许的 CORS Origin，逗号分隔 |
| `SQL_MCP_SECURITY_QUERY_TIMEOUT_MS` | `10000` | 查询超时时间 (ms) |
| `SQL_MCP_SECURITY_SAMPLE_MAX_ROWS` | `100` | 采样最大行数上限 |
| `SQL_MCP_SECURITY_QUERY_MAX_ROWS` | `200` | `executeQuery` 单次返回行数上限 |
| `SQL_MCP_SECURITY_RATE_LIMIT_ENABLED` | `false` | 启用 `/mcp` 路由限流 |
| `SQL_MCP_SECURITY_RATE_LIMIT_WINDOW_MS` | `60000` | 限流窗口 (ms) |
| `SQL_MCP_SECURITY_RATE_LIMIT_MAX` | `120` | 窗口内全局最大请求数 |
| `SQL_MCP_SECURITY_RATE_LIMIT_PER_IP_MAX` | `60` | 窗口内单 IP 最大请求数 |
| **其他** | | |
| `SQL_MCP_CACHE_PREWARM_ON_START` | `true` | 启动时后台预热表清单 |
| `SQL_MCP_MCP_STDIO_SAFE` | `false` | 启用 stdio 安全预设 |
| `SQL_MCP_MCP_STDIO_COMPACT` | `false` | 启用紧凑输出 |
| `SQL_MCP_OUTPUT_JSON_ONLY` | `false` | 仅输出 JSON 内容 |

> 更多配置细节请参阅 `src/core/config/loader.ts`。

---

## 🏛️ 项目结构

```
.
├── src/
│   ├── cli/          # 命令行接口 (CLI) 相关逻辑
│   ├── connectors/   # 数据库连接器 (目前为 MySQL)
│   ├── core/         # 核心业务逻辑，包括配置加载和日志
│   ├── mcp/          # MCP 协议实现和处理器
│   ├── middleware/   # Express 中间件 (认证、日志、限流等)
│   ├── services/     # 核心服务 (元数据、查询、缓存等)
│   ├── types/        # TypeScript 类型定义
│   ├── utils/        # 通用工具函数
│   ├── cli.ts        # CLI 入口文件
│   └── index.ts      # HTTP 服务入口文件
├── Dockerfile        # 用于构建 Docker 镜像
├── package.json      # 项目依赖和脚本
└── tsconfig.json     # TypeScript 配置文件
```

---

## 🤝 贡献

我们非常欢迎社区通过 **Pull Request** 或 **Issues** 为项目做出贡献。在提交代码前，请确保您的代码通过了 lint 和 test 检查。

```bash
# 代码风格检查
npm run lint

# 运行单元测试
npm run test
```

---

## 📄 开源许可

本项目基于 [MIT](LICENSE) 许可开源。 