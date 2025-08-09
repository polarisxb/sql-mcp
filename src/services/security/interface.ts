import { SampleData } from '../../core/types/database.js'

export interface ISecurityService {
  validateIdentifier(identifier: string): void
  validateWhereClause(whereClause: string): void
  validateReadOnlyQuery(query: string): void
  sanitizeSampleData(data: SampleData): SampleData
  sanitizeQueryResults(results: any[]): any[]
} 