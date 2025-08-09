import { describe, test, expect } from 'vitest'
import { SecurityService } from '../service.js'

describe('SecurityService', () => {
  const svc = new SecurityService()

  describe('validateIdentifier', () => {
    test('accepts safe identifiers', () => {
      expect(() => svc.validateIdentifier('users')).not.toThrow()
      expect(() => svc.validateIdentifier('db.users_01')).not.toThrow()
      expect(() => svc.validateIdentifier('schema$1.table_2')).not.toThrow()
    })

    test('rejects unsafe identifiers', () => {
      expect(() => svc.validateIdentifier('users;drop')).toThrow()
      expect(() => svc.validateIdentifier('users-1')).toThrow()
      expect(() => svc.validateIdentifier('users name')).toThrow()
    })
  })

  describe('validateWhereClause', () => {
    test('accepts safe where clause', () => {
      expect(() => svc.validateWhereClause("id > 0 AND name LIKE 'A%'")).not.toThrow()
    })

    test('rejects dangerous keywords', () => {
      expect(() => svc.validateWhereClause('DROP TABLE users')).toThrow()
      expect(() => svc.validateWhereClause('1 = 1; SELECT * FROM users')).toThrow()
      expect(() => svc.validateWhereClause('name = \"a\" -- comment')).toThrow()
      expect(() => svc.validateWhereClause('name = \"a\" # inline')).toThrow()
    })
  })

  describe('validateReadOnlyQuery', () => {
    test('accepts SELECT and SHOW', () => {
      expect(() => svc.validateReadOnlyQuery('SELECT * FROM users')).not.toThrow()
      expect(() => svc.validateReadOnlyQuery('  show tables')).not.toThrow()
    })

    test('rejects non-readonly or dangerous', () => {
      expect(() => svc.validateReadOnlyQuery('UPDATE users SET a=1')).toThrow()
      expect(() => svc.validateReadOnlyQuery('DELETE FROM users')).toThrow()
      expect(() => svc.validateReadOnlyQuery('SELECT * FROM a UNION SELECT * FROM b')).toThrow()
      expect(() => svc.validateReadOnlyQuery('SELECT * FROM users; SELECT * FROM secrets')).toThrow()
    })
  })

  describe('sanitizeSampleData', () => {
    test('masks sensitive columns', () => {
      const data = {
        columns: ['id', 'password', 'name', 'api_key'],
        data: [ [1, 'p@ss', 'tom', 'xyz'], [2, 'p2', 'jerry', 'abc'] ],
        total: 2,
        hasMore: false
      }
      const res = svc.sanitizeSampleData(data)
      expect(res.data[0][1]).toBe('***REDACTED***')
      expect(res.data[0][3]).toBe('***REDACTED***')
      expect(res.data[0][2]).toBe('tom')
    })
  })

  describe('sanitizeQueryResults', () => {
    test('masks sensitive fields in rows', () => {
      const rows = [
        { id: 1, token: 't', name: 'tom' },
        { id: 2, token: 't2', name: 'jerry' }
      ]
      const res = svc.sanitizeQueryResults(rows)
      expect(res[0].token).toBe('***REDACTED***')
      expect(res[1].name).toBe('jerry')
    })
  })
}) 