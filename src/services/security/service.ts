import { Injectable } from '../../core/di/decorators.js'
import { SampleData } from '../../core/types/database.js'
import { ISecurityService } from './interface.js'

@Injectable()
export class SecurityService implements ISecurityService {
  private readonly sensitiveFields = [
    'password', 'passwd', 'pwd',
    'secret', 'token', 'api_key', 'apikey',
    'credit_card', 'creditcard', 'card_number', 'cardnumber',
    'ssn', 'social_security', 'socialsecurity',
    'bank_account', 'bankaccount',
    'auth', 'authentication',
    'private', 'confidential'
  ]

  private readonly sqlInjectionKeywords = [
    'insert', 'update', 'delete', 'drop', 'alter', 'create',
    'truncate', 'replace', 'information_schema',
    'exec', 'execute', 'sleep', 'benchmark',
    'union', 'into.*outfile', 'load.*data',
    'sys', 'mysql', 'performance_schema'
  ]

  validateIdentifier(identifier: string): void {
    const id = String(identifier ?? '').trim()
    if (!id) {
      throw new Error('标识符不能为空')
    }
    const safePattern = /^[a-zA-Z0-9_$.]+$/
    if (!safePattern.test(id)) {
      throw new Error(`不安全的标识符: ${identifier}`)
    }
  }

  validateWhereClause(whereClause: string): void {
    const normalized = whereClause.toLowerCase()
    for (const keyword of this.sqlInjectionKeywords) {
      const pattern = new RegExp(`\\b${keyword}\\b`, 'i')
      if (pattern.test(normalized)) {
        throw new Error(`WHERE子句包含潜在危险关键字: ${keyword}`)
      }
    }
    if (normalized.includes('--') || normalized.includes('#') || normalized.includes(';')) {
      throw new Error('WHERE子句包含潜在危险字符')
    }
  }

  validateReadOnlyQuery(query: string): void {
    const normalized = query.trim().toLowerCase()
    if (!normalized.startsWith('select') && !normalized.startsWith('show')) {
      throw new Error('只允许SELECT和SHOW查询')
    }
    for (const keyword of this.sqlInjectionKeywords) {
      const pattern = new RegExp(`\\b${keyword}\\b`, 'i')
      if (pattern.test(normalized)) {
        throw new Error(`查询包含潜在危险关键字: ${keyword}`)
      }
    }
    if (normalized.includes('--') || normalized.includes('#') || normalized.includes(';')) {
      throw new Error('查询包含潜在危险字符')
    }
  }

  sanitizeSampleData(data: SampleData): SampleData {
    const sanitized: SampleData = {
      columns: [...data.columns],
      data: data.data.map(row => [...row]),
      total: data.total,
      hasMore: data.hasMore
    }
    const sensitiveIdx: number[] = []
    data.columns.forEach((c, i) => { if (this.isSensitiveField(c)) sensitiveIdx.push(i) })
    if (!sensitiveIdx.length) return sanitized
    for (let i = 0; i < sanitized.data.length; i++) {
      for (const idx of sensitiveIdx) sanitized.data[i][idx] = '***REDACTED***'
    }
    return sanitized
  }

  sanitizeQueryResults(results: any[]): any[] {
    if (!results.length) return results
    const sample = results[0]
    const sensitiveKeys = Object.keys(sample).filter(k => this.isSensitiveField(k))
    if (!sensitiveKeys.length) return results
    return results.map(row => {
      const r = { ...row }
      for (const k of sensitiveKeys) r[k] = '***REDACTED***'
      return r
    })
  }

  private isSensitiveField(name: string): boolean {
    const n = name.toLowerCase()
    return this.sensitiveFields.some(p => n === p || n.includes(p))
  }
} 