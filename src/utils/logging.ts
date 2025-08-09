import fs from 'node:fs'
import path from 'node:path'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface Logger {
  debug(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
  child(scope: string): Logger
  setLevel(level: LogLevel): void
}

export interface LoggerOptions {
  level?: LogLevel
  destination?: 'console' | 'file'
  filePath?: string
  scope?: string
  // Whether to include stack for Error objects automatically
  includeErrorStack?: boolean
}

const levelWeights: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

function colorize(level: LogLevel, text: string): string {
  // Basic ANSI colors without external deps
  const colors: Record<LogLevel, [string, string]> = {
    debug: ['\x1b[36m', '\x1b[0m'], // cyan
    info: ['\x1b[32m', '\x1b[0m'], // green
    warn: ['\x1b[33m', '\x1b[0m'], // yellow
    error: ['\x1b[31m', '\x1b[0m'], // red
  }
  const [start, end] = colors[level]
  return `${start}${text}${end}`
}

function formatTimestamp(date = new Date()): string {
  return date.toISOString()
}

function safeSerialize(arg: unknown): string {
  if (arg instanceof Error) {
    return JSON.stringify(
      {
        name: arg.name,
        message: arg.message,
        stack: arg.stack,
      },
      null,
      0
    )
  }
  try {
    return typeof arg === 'string' ? arg : JSON.stringify(arg)
  } catch {
    return String(arg)
  }
}

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

class ConsoleAndFileLogger implements Logger {
  private level: LogLevel
  private destination: 'console' | 'file'
  private filePath?: string
  private scope?: string
  private includeErrorStack: boolean

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? 'info'
    this.destination = options.destination ?? 'console'
    this.filePath = options.filePath
    this.scope = options.scope
    this.includeErrorStack = options.includeErrorStack ?? true

    if (this.destination === 'file') {
      if (!this.filePath) {
        throw new Error('filePath is required when destination is "file"')
      }
      ensureDir(this.filePath)
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level
  }

  child(scope: string): Logger {
    return new ConsoleAndFileLogger({
      level: this.level,
      destination: this.destination,
      filePath: this.filePath,
      scope: this.scope ? `${this.scope}:${scope}` : scope,
      includeErrorStack: this.includeErrorStack,
    })
  }

  private shouldLog(level: LogLevel): boolean {
    return levelWeights[level] >= levelWeights[this.level]
  }

  private write(level: LogLevel, message: string, args: unknown[]): void {
    if (!this.shouldLog(level)) return

    const ts = formatTimestamp()
    const levelText = level.toUpperCase().padEnd(5)
    const scopeText = this.scope ? `[${this.scope}] ` : ''

    const normalizedArgs = this.includeErrorStack
      ? args.map((a) => (a instanceof Error ? `${a.message} ${a.stack ?? ''}` : a))
      : args

    const msg = `${ts} ${levelText} ${scopeText}${message}`
    const line = [msg, ...normalizedArgs.map(safeSerialize)].join(' ')

    if (this.destination === 'file') {
      fs.appendFileSync(this.filePath!, line + '\n', { encoding: 'utf8' })
      return
    }

    // console destination with colors
    const colored = `${formatTimestamp()} ${colorize(level, levelText)} ${scopeText}${message}`
    const suffix = normalizedArgs.length ? ' ' + normalizedArgs.map(safeSerialize).join(' ') : ''

    switch (level) {
      case 'debug':
        // eslint-disable-next-line no-console
        console.debug(colored + suffix)
        break
      case 'info':
        // eslint-disable-next-line no-console
        console.info(colored + suffix)
        break
      case 'warn':
        // eslint-disable-next-line no-console
        console.warn(colored + suffix)
        break
      case 'error':
        // eslint-disable-next-line no-console
        console.error(colored + suffix)
        break
    }
  }

  debug(message: string, ...args: unknown[]): void {
    this.write('debug', message, args)
  }

  info(message: string, ...args: unknown[]): void {
    this.write('info', message, args)
  }

  warn(message: string, ...args: unknown[]): void {
    this.write('warn', message, args)
  }

  error(message: string, ...args: unknown[]): void {
    this.write('error', message, args)
  }
}

export function createLogger(options: LoggerOptions = {}): Logger {
  return new ConsoleAndFileLogger(options)
}

export function createLoggerFromConfig(config: {
  level?: LogLevel
  destination?: 'console' | 'file'
  filePath?: string
}): Logger {
  return createLogger({
    level: (config.level as LogLevel) ?? 'info',
    destination: (config.destination as 'console' | 'file') ?? 'console',
    filePath: config.filePath,
  })
} 