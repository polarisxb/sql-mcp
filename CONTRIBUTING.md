# Contributing to sql-mcp

Thanks for your interest! Please follow the steps below.

## Development Setup
- Node.js >= 18
- Install deps: `npm ci`
- Build: `node ./node_modules/typescript/bin/tsc`
- Test: `node ./node_modules/vitest/vitest.mjs run`

## Branch & PR
- Fork and create feature branches from `main`.
- Keep PRs small and focused; include tests and update README if needed.
- Use conventional commits if possible (feat/fix/chore/docs/test).

## Coding Guidelines
- TypeScript strictness, no `any` unless necessary.
- Follow existing code style. Run `npm run lint` if available.
- Add tests for new functionality and edge-cases.

## Reporting Issues
- Provide reproduction steps, expected/actual behavior, error logs.
- Include your OS, Node.js version, and configuration.

## Security
- Do not post credentials in issues or PRs.
- For security vulnerabilities, please open a private report (see SECURITY.md). 