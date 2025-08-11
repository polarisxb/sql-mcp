# SQL-MCP

[![CI](https://github.com/polarisxb/sql-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/polarisxb/sql-mcp/actions/workflows/ci.yml)
[![Docker](https://github.com/polarisxb/sql-mcp/actions/workflows/docker.yml/badge.svg)](https://github.com/polarisxb/sql-mcp/actions/workflows/docker.yml)
[![npm version](https://img.shields.io/npm/v/%40polarisxb%2Fsql-mcp.svg)](https://www.npmjs.com/package/@polarisxb/sql-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/polarisxb/sql-mcp)

数据库上下文协议（Model Context Protocol, MCP）服务器，提供数据库元数据、样本数据与只读查询能力，支持 stdio 与 Streamable HTTP 传输。

English version below. 如需英文全文，请见 [README.en.md](README.en.md)。变更记录见 [CHANGELOG.md](CHANGELOG.md)。

---

## 安装

- 全局安装（推荐）
```bash
npm i -g @polarisxb/sql-mcp
```
- 或源码构建
```bash
npm ci
npm run build
```

## 快速开始

- 使用 stdio 启动（适合在 Cursor/Claude Desktop 里作为命令型 MCP）
```bash
sql-mcp --type mysql \
  --host 127.0.0.1 --port 3306 \
  --user root --password ****** --database mydb \
  --transport stdio
```

- 使用 HTTP 启动（提供 /mcp 接口，外部通过 URL 连接）
```bash
sql-mcp --type mysql \
  --host 127.0.0.1 --port 3306 \
  --user root --password ****** --database mydb \
  --transport http --httpPort 3000
```

- 日志与输出
```bash
sql-mcp --verbose
sql-mcp --log-dest file --log-file ./logs/sql-mcp.log
```

- Stdio 安全与紧凑输出（新）
```bash
# 更安全的 stdio 预设：压低日志、紧凑输出、合理上限
sql-mcp --transport stdio --stdio-safe
# 仅返回 JSON（更适合程序消费）
sql-mcp --transport stdio --json-only
```

## Cursor 集成

- stdio（推荐）：
  - command: `node`
  - args: `["C:/all_project/sql-mcp/dist/cli.js", "--transport", "stdio"]`
  - Env: 设置 `SQL_MCP_*` 数据库只读账号
- http：
  - url: `http://127.0.0.1:3000/mcp`

## 配置

配置优先级：默认值 < `.env`/JSON/JS 配置 < 环境变量（`SQL_MCP_*`）。

常用环境变量（节选）：
- 数据库
  - `SQL_MCP_DB_TYPE` → `database.type`（`mysql`）
  - `SQL_MCP_DB_HOST` / `SQL_MCP_DB_PORT` / `SQL_MCP_DB_USER` / `SQL_MCP_DB_PASSWORD` / `SQL_MCP_DB_NAME`
  - `SQL_MCP_DB_TIMEOUT`（连接超时毫秒）
- 日志
  - `SQL_MCP_LOG_LEVEL`（`debug|info|warn|error`）
  - `SQL_MCP_LOG_DESTINATION`（`console|file`）
  - `SQL_MCP_LOG_FILE_PATH`
- MCP
  - `SQL_MCP_MCP_TRANSPORT`（`stdio|http`）
  - `SQL_MCP_MCP_HTTP_PORT`

复制 `ENV.example` 作为模板并填充。

## CLI 选项一览

| 选项 | 类型 | 默认 | 说明 | 示例 |
|---|---|---|---|---|
| `--type` | string | `mysql` | 数据库类型（当前支持 MySQL） | `--type mysql` |
| `--host` | string | `127.0.0.1` | 数据库主机 | `--host 192.168.1.10` |
| `--port` | number | `3306` | 数据库端口 | `--port 3306` |
| `--user` | string | - | 数据库用户（建议只读权限） | `--user reader` |
| `--password` | string | - | 数据库密码 | `--password secret` |
| `--database` | string | - | 默认数据库/Schema | `--database appdb` |
| `--transport` | enum | `stdio` | MCP 传输：`stdio` 或 `http` | `--transport http` |
| `--httpPort` | number | `3000` | HTTP 服务器端口（当 `--transport http` 时生效） | `--httpPort 3000` |
| `--verbose` | flag | `false` | 打印 debug 日志 | `--verbose` |
| `--log-dest` | enum | `console` | 日志目的地：`console`/`file` | `--log-dest file` |
| `--log-file` | string | - | 日志文件路径（当 `--log-dest file` 时生效） | `--log-file ./logs/sql-mcp.log` |
| `--stdio-safe` | flag | `false` | Stdio 安全预设：压低日志、紧凑输出、合理上限 | `--stdio-safe` |
| `--compact` | flag | `false` | 紧凑输出（减少 Markdown 体积） | `--compact` |
| `--json-only` | flag | `false` | 仅输出 JSON 内容 | `--json-only` |

> 等价环境变量：均可用 `SQL_MCP_*` 设置，优先级高于文件配置。

## 环境变量对照表

| 环境变量 | 类型/默认 | 说明 |
|---|---|---|
| `SQL_MCP_DB_TYPE` | `mysql` | 数据库类型 |
| `SQL_MCP_DB_HOST` | `127.0.0.1` | 主机 |
| `SQL_MCP_DB_PORT` | `3306` | 端口 |
| `SQL_MCP_DB_USER` | - | 用户 |
| `SQL_MCP_DB_PASSWORD` | - | 密码 |
| `SQL_MCP_DB_NAME` | - | 数据库名 |
| `SQL_MCP_DB_TIMEOUT` | `10000` | 连接超时（ms） |
| `SQL_MCP_DB_POOL_CONNECTION_LIMIT` | `10` | 连接池最大连接数 |
| `SQL_MCP_DB_POOL_WAIT_FOR_CONNECTIONS` | `true` | 池满时是否等待 |
| `SQL_MCP_DB_POOL_QUEUE_LIMIT` | `0` | 等待队列上限（0=无限） |
| `SQL_MCP_LOG_LEVEL` | `info` | 日志级别：`debug|info|warn|error` |
| `SQL_MCP_LOG_DESTINATION` | `console` | 日志目的地：`console|file` |
| `SQL_MCP_LOG_FILE_PATH` | - | 文件路径（当目的地为 `file`） |
| `SQL_MCP_LOG_SLOW_QUERY_MS` | `1000` | 慢查询阈值（ms），超过则 warn |
| `SQL_MCP_LOG_HTTP_REQUESTS` | `true` | 是否记录 HTTP 请求日志 |
| `SQL_MCP_MCP_TRANSPORT` | `stdio` | MCP 传输：`stdio|http` |
| `SQL_MCP_MCP_HTTP_PORT` | `3000` | HTTP 端口（当传输为 `http`） |
| `SQL_MCP_MCP_HTTP_API_KEY` | - | 单个 API Key（可选） |
| `SQL_MCP_MCP_HTTP_API_KEYS` | - | 多个 API Key，逗号分隔 |
| `SQL_MCP_MCP_ENABLE_DNS_REBINDING_PROTECTION` | `false` | 启用 Host 校验 |
| `SQL_MCP_MCP_ALLOWED_HOSTS` | - | 允许的 Host 列表，逗号分隔 |
| `SQL_MCP_MCP_CORS_ALLOWED_ORIGINS` | - | 允许的 CORS Origin 列表，逗号分隔 |
| `SQL_MCP_SECURITY_SAMPLE_MAX_ROWS` | `100` | 采样最大行数上限 |
| `SQL_MCP_SECURITY_QUERY_TIMEOUT_MS` | `10000` | 查询超时时间（ms） |
| `SQL_MCP_SECURITY_RATE_LIMIT_ENABLED` | `false` | 启用 `/mcp` 路由限流 |
| `SQL_MCP_SECURITY_RATE_LIMIT_WINDOW_MS` | `60000` | 限流窗口（ms） |
| `SQL_MCP_SECURITY_RATE_LIMIT_MAX` | `120` | 窗口内全局最大请求数 |
| `SQL_MCP_SECURITY_RATE_LIMIT_PER_IP_MAX` | `60` | 窗口内单 IP 最大请求数 |
| `SQL_MCP_SECURITY_QUERY_MAX_ROWS` | `200` | `executeQuery` 单次返回行数上限（分页上限） |
| `SQL_MCP_MCP_STDIO_SAFE` | `false` | 启用 stdio 安全预设 |
| `SQL_MCP_MCP_STDIO_COMPACT` | `false` | 启用紧凑输出（减少 Markdown 体积） |
| `SQL_MCP_OUTPUT_JSON_ONLY` | `false` | 仅输出 JSON 内容 |
| `SQL_MCP_CACHE_PREWARM_ON_START` | `true` | 启动时后台预热表清单 |

> 更多映射详见 `src/core/config/loader.ts`。

## 功能概览
- 元数据：库/表/列、索引、约束、关系
- 取样：`SELECT * FROM schema.table LIMIT N`（WHERE 可选，自动脱敏）；当存在更多数据时，返回中包含 `hasMore=true`，可用 `offset+limit` 作为下一页起点。
- 查询：只读（`SELECT`/`SHOW`）；`executeQuery` 支持 `limit/offset` 分页，返回 JSON 元信息（`limit/offset/nextOffset/hasMore/durationMs/columns/data`）。
- 检索（新）：`searchTables(pattern)` 与 `searchColumns(pattern)` 快速检索表或列。
- 维护（新）：`refreshCache(scope=all|table)` 刷新元数据缓存。