# SQL-MCP

[![CI](https://github.com/polarisxb/sql-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/polarisxb/sql-mcp/actions/workflows/ci.yml)
[![Docker](https://github.com/polarisxb/sql-mcp/actions/workflows/docker.yml/badge.svg)](https://github.com/polarisxb/sql-mcp/actions/workflows/docker.yml)
[![npm version](https://img.shields.io/npm/v/%40polarisxb%2Fsql-mcp.svg)](https://www.npmjs.com/package/@polarisxb/sql-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

MySQL-backed Model Context Protocol (MCP) server providing database metadata, sample data and read-only queries. Supports stdio and Streamable HTTP transports.

Chinese version: see README.md. Changelog: see [CHANGELOG.md](CHANGELOG.md).

## Install
```bash
npm i -g @polarisxb/sql-mcp
```

## Quick start
```bash
# stdio
sql-mcp --type mysql \
  --host 127.0.0.1 --port 3306 \
  --user root --password ****** --database mydb \
  --transport stdio

# http
sql-mcp --type mysql \
  --host 127.0.0.1 --port 3306 \
  --user root --password ****** --database mydb \
  --transport http --httpPort 3000
```

## Config
- Override defaults via env vars prefixed with `SQL_MCP_`.
- See `src/core/config/loader.ts` for full mapping.

## New in 1.2 (stdio-focused)
- Flags: `--stdio-safe`, `--compact`, `--json-only`
- executeQuery: supports `limit/offset` pagination and returns JSON meta (`limit/offset/nextOffset/hasMore/durationMs/columns/data`)
- Tools: `searchTables(pattern)`, `searchColumns(pattern)`, `refreshCache(scope)`
- Prewarm on start: `SQL_MCP_CACHE_PREWARM_ON_START=true`

## Docker
```bash
docker run --rm -p 3000:3000 \
  -e SQL_MCP_DB_TYPE=mysql \
  -e SQL_MCP_DB_HOST=host \
  -e SQL_MCP_DB_PORT=3306 \
  -e SQL_MCP_DB_USER=user \
  -e SQL_MCP_DB_PASSWORD=pass \
  -e SQL_MCP_DB_NAME=mydb \
  ghcr.io/polarisxb/sql-mcp:latest --transport http --httpPort 3000
```

## Develop
- Test: `npm run test`
- Build: `npm run build`
- MCP debugging: use [MCP Inspector](https://github.com/modelcontextprotocol/inspector)

## License
MIT 