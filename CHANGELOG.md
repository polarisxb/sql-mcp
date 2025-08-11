# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2025-08-11
- Stdio experience:
  - New flags: `--stdio-safe`, `--compact`, `--json-only`
  - `executeQuery` supports `limit/offset` with JSON meta (`limit/offset/nextOffset/hasMore/durationMs/columns/data`)
- Tools:
  - `searchTables(pattern)`, `searchColumns(pattern)` for quick discovery
  - `refreshCache(scope=all|table)` to refresh metadata cache
- Startup:
  - Background prewarm of table list (`cache.prewarmOnStart`, `SQL_MCP_CACHE_PREWARM_ON_START`)
- Config:
  - `security.queryMaxRows` caps `executeQuery` page size
- Docs/Tests:
  - README updated for stdio flags, tools, pagination; tests adjusted and all green

## [1.1.0] - 2025-08-10
- Logging:
  - Slow query threshold `logging.slowQueryMs` with warn-level logging
  - Structured HTTP request logs (`logging.httpRequests`)
- HTTP Security:
  - Optional API Key(s): `mcp.httpApiKey` / `mcp.httpApiKeys`
  - DNS Rebinding/Host allowlist: `mcp.enableDnsRebindingProtection`, `mcp.allowedHosts`
  - CORS allowlist: `mcp.corsAllowedOrigins`
- Rate Limiting:
  - In-memory middleware for `/mcp` with `security.rateLimit.{enabled,windowMs,max,perIpMax}`
- DB Connector:
  - Configurable pool: `database.pool.{connectionLimit,waitForConnections,queueLimit}`
  - Query timeout `security.queryTimeoutMs`
- Sampling:
  - `SampleDataHandler` now also returns JSON payload with `nextOffset` alongside markdown
- Packaging/CI:
  - Package scoped to `@polarisxb/sql-mcp`
  - Docker workflow: explicit Dockerfile + Buildx container driver + inline cache
  - CI/Release: use `npm run build` with `tsconfig.build.json` (exclude tests)
- Docs:
  - README: badges, Chinese-first with English section; CLI/env tables

## [1.0.1] - 2025-08-09
- Initial public release of SQL-MCP
- MySQL connector, services (metadata/sampler/security)
- MCP integration: tools/resources, stdio/http transports
- E2E/units green; Dockerfile multi-stage build

---

Dates use UTC. See repository history for detailed commits. 