import crypto from 'node:crypto'

export interface Credentials {
  username?: string
  password?: string
  apiKey?: string
  token?: string
}

export interface CredentialManagerOptions {
  encryptSecret?: string
}

export class CredentialManager {
  private secret: string

  constructor(options: CredentialManagerOptions = {}) {
    this.secret = options.encryptSecret ?? process.env.SQL_MCP_SECRET ?? ''
  }

  encrypt(plain: string): string {
    if (!this.secret) return plain
    const key = crypto.createHash('sha256').update(this.secret).digest()
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`
  }

  decrypt(data: string): string {
    if (!this.secret) return data
    const [ivHex, encHex] = data.split(':')
    if (!ivHex || !encHex) return data
    const key = crypto.createHash('sha256').update(this.secret).digest()
    const iv = Buffer.from(ivHex, 'hex')
    const encrypted = Buffer.from(encHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return decrypted.toString('utf8')
  }

  protect<T extends Credentials>(cred: T): T {
    const clone: any = { ...cred }
    if (clone.password) clone.password = this.encrypt(clone.password)
    if (clone.apiKey) clone.apiKey = this.encrypt(clone.apiKey)
    if (clone.token) clone.token = this.encrypt(clone.token)
    return clone as T
  }

  reveal<T extends Credentials>(cred: T): T {
    const clone: any = { ...cred }
    if (clone.password) clone.password = this.decrypt(clone.password)
    if (clone.apiKey) clone.apiKey = this.decrypt(clone.apiKey)
    if (clone.token) clone.token = this.decrypt(clone.token)
    return clone as T
  }
}

const DEFAULT_SENSITIVE_FIELDS = [
  'password',
  'pwd',
  'secret',
  'token',
  'access_token',
  'refresh_token',
  'credit_card',
  'ssn',
  'apiKey',
  'api_key',
]

export function maskSensitive<T>(data: T, customFields: string[] = []): T {
  const fields = new Set([...DEFAULT_SENSITIVE_FIELDS, ...customFields].map((f) => f.toLowerCase()))
  const maskValue = (val: unknown) => (typeof val === 'string' ? '***' : val)

  function walk(input: any): any {
    if (Array.isArray(input)) return input.map(walk)
    if (input && typeof input === 'object') {
      const out: any = Array.isArray(input) ? [] : {}
      for (const [k, v] of Object.entries(input)) {
        if (fields.has(k.toLowerCase())) {
          out[k] = maskValue(v)
        } else {
          out[k] = walk(v)
        }
      }
      return out
    }
    return input
  }

  return walk(data)
}

// SQL injection detection tuned to our SecurityService config
const INJECTION_PATTERNS = [
  /(;\s*drop\s+table)/i,
  /(;\s*truncate\s+table)/i,
  /(;\s*alter\s+table)/i,
  /(--|#).*/i,
  /\/\*[\s\S]*?\*\//, // block comment
  /union\s+all\s+select/i,
  /into\s+outfile/i,
  /load\s+data/i,
  /xp_cmdshell/i,
]

export function hasSqlInjectionRisk(input: string): boolean {
  if (!input) return false
  const normalized = input.trim()
  return INJECTION_PATTERNS.some((re) => re.test(normalized))
}

export function assertNoSqlInjection(input: string): void {
  if (hasSqlInjectionRisk(input)) {
    throw new Error('Potential SQL injection detected')
  }
} 