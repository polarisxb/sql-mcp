# SQL-MCP

数据库上下文协议（MCP）服务器，提供数据库元数据、样本数据与只读查询能力，支持 stdio 与 Streamable HTTP 传输。

## 安装

```bash
npm install
npm run build
```

## 快速开始

- 使用 stdio 启动：

```bash
node dist/cli.js --host 127.0.0.1 --port 3306 --user root --password ****** --database mydb --type mysql --transport stdio
```

- 使用 HTTP 启动：

```bash
node dist/cli.js --host 127.0.0.1 --port 3306 --user root --password ****** --database mydb --type mysql --transport http --httpPort 3000
```

- 带日志控制：

```bash
node dist/cli.js --verbose
node dist/cli.js --log-dest file --log-file ./logs/sql-mcp.log
```

## 配置

应用从如下位置加载配置（后者覆盖前者）：
- 内置默认值（见 `src/core/config/defaults.ts`）
- 环境变量（前缀 `SQL_MCP_`）
- 配置文件（`.env`/`.json`/`.js`），通过 `CONFIG_FILE` 指定

可复制 `ENV.example` 作为模板并填入生产环境变量。

环境变量映射（节选）：
- 数据库：
  - `SQL_MCP_DB_TYPE` → `database.type`（`mysql`）
  - `SQL_MCP_DB_HOST` → `database.host`
  - `SQL_MCP_DB_PORT` → `database.port`
  - `SQL_MCP_DB_USER` → `database.user`
  - `SQL_MCP_DB_PASSWORD` → `database.password`
  - `SQL_MCP_DB_NAME` → `database.database`
  - `SQL_MCP_DB_TIMEOUT` → `database.connectionTimeout`
- 日志：
  - `SQL_MCP_LOG_LEVEL` → `logging.level`（`debug|info|warn|error`）
  - `SQL_MCP_LOG_DESTINATION` → `logging.destination`（`console|file`）
  - `SQL_MCP_LOG_FILE_PATH` → `logging.filePath`
- MCP：
  - `SQL_MCP_MCP_TRANSPORT` → `mcp.transport`（`stdio|http`）
  - `SQL_MCP_MCP_HTTP_PORT` → `mcp.httpPort`

更多映射详见 `src/core/config/loader.ts`。

## MCP Inspector

建议使用 [MCP Inspector](https://github.com/modelcontextprotocol/inspector) 进行调试与测试。
- stdio：选择本地命令，指向 `node dist/cli.js ... --transport stdio`
- http：配置 `POST /mcp` 地址，首次初始化后会返回 `Mcp-Session-Id` 并复用

## 安全

- 所有查询为只读，服务层与处理器对 SQL/WHERE 做注入校验。
- 输出统一脱敏（敏感字段如 `password`/`token` 等会被 `***` 处理）。
- 可选凭证保护：见 `src/utils/security.ts` 中 `CredentialManager`。

## 日志

- 使用 `src/utils/logging.ts`，支持级别、彩色控制台、文件输出、子作用域。
- 通过 CLI `--verbose/--log-dest/--log-file` 或环境变量控制。

## 部署

### npm 发布
- 打 tag（例如 `v1.0.0`）推送后，`Release (npm)` 工作流会构建、测试并发布到 npm。
- 需要在仓库设置 `NPM_TOKEN`（Actions secrets）。

### Docker 镜像（GHCR）
- Push 到 `main` 或推 tag，会由 `Docker (GHCR)` 工作流构建并推送镜像到 `ghcr.io/polarisxb/sql-mcp`。
- 运行示例：
```bash
docker run --rm -p 3000:3000 \
  -e SQL_MCP_DB_TYPE=mysql \
  -e SQL_MCP_DB_HOST=host \
  -e SQL_MCP_DB_PORT=3306 \
  -e SQL_MCP_DB_USER=user \
  -e SQL_MCP_DB_PASSWORD=pass \
  -e SQL_MCP_DB_NAME=mydb \
  ghcr.io/polarisxb/sql-mcp:<tag> --transport http --httpPort 3000
```

### Compose
- `docker-compose.yml` 已提供（MySQL + 服务），直接 `docker-compose up -d`。

## 开发

- 测试：
```bash
node ./node_modules/vitest/vitest.mjs run
```
- 构建：
```bash
node ./node_modules/typescript/bin/tsc
```

## 目录
- `src/connectors/mysql`：MySQL 连接器与元数据映射/SQL 构建
- `src/services/*`：元数据/采样/安全服务
- `src/mcp/*`：MCP 定义、处理器、服务器工厂、传输
- `src/utils/*`：日志、错误、通用安全工具 