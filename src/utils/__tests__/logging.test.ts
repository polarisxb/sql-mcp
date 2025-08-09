import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import * as path from 'node:path'
import { createLogger } from '../logging.js'

describe('logging util', () => {
  const originalConsole = { debug: console.debug, info: console.info, warn: console.warn, error: console.error }
  beforeEach(() => {
    console.debug = vi.fn()
    console.info = vi.fn()
    console.warn = vi.fn()
    console.error = vi.fn()
  })
  afterEach(() => {
    console.debug = originalConsole.debug
    console.info = originalConsole.info
    console.warn = originalConsole.warn
    console.error = originalConsole.error
    vi.clearAllMocks()
  })

  test('respects log level filtering', () => {
    const logger = createLogger({ level: 'warn' })
    logger.debug('a')
    logger.info('b')
    logger.warn('c')
    logger.error('d')
    expect(console.debug).not.toHaveBeenCalled()
    expect(console.info).not.toHaveBeenCalled()
    expect(console.warn).toHaveBeenCalled()
    expect(console.error).toHaveBeenCalled()
  })

  test('child logger prefixes scope', () => {
    const base = createLogger({ level: 'debug' })
    const child = base.child('child')
    child.info('hello')
    expect(console.info).toHaveBeenCalled()
    const msg = (console.info as any).mock.calls[0][0]
    expect(String(msg)).toContain('[child]')
  })

  test('file destination writes to file', () => {
    const existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any)
    const appendSpy = vi.spyOn(fs, 'appendFileSync').mockImplementation(() => undefined as any)

    const logger = createLogger({ level: 'debug', destination: 'file', filePath: path.join('logs', 'app.log') })
    logger.info('to-file', { a: 1 })

    expect(appendSpy).toHaveBeenCalled()

    existsSpy.mockRestore()
    mkdirSpy.mockRestore()
    appendSpy.mockRestore()
  })
}) 