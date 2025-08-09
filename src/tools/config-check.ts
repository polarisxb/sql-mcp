import 'reflect-metadata'
import { loadConfig } from '../core/config/index.js'
import { MySQLConnector } from '../connectors/mysql/connector.js'

function sanitize(obj: any): any {
  if (obj == null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(sanitize)
  const out: any = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = k.toLowerCase()
    if (['password', 'token', 'secret'].some(s => key.includes(s))) {
      out[k] = '***'
    } else {
      out[k] = sanitize(v as any)
    }
  }
  return out
}

async function main() {
  const configPath = process.env.CONFIG_FILE
  const cfg = loadConfig({ configPath, loadEnv: true })
  console.log('[config-check] Validated config:')
  console.log(JSON.stringify(sanitize(cfg), null, 2))

  // Simple connectivity check for MySQL
  try {
    const connector = new MySQLConnector()
    await connector.connect(cfg.database)
    const ok = await connector.ping()
    await connector.disconnect()
    if (!ok) throw new Error('Ping failed')
    console.log('[config-check] Database connectivity: OK')
    process.exit(0)
  } catch (err) {
    console.error('[config-check] Database connectivity: FAILED')
    console.error((err as Error).message)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('[config-check] Unexpected error:', err)
  process.exit(1)
}) 