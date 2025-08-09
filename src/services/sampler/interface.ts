import { SampleData } from '../../core/types/database.js'

export interface ISamplerService {
  getSampleData(tableName: string, limit?: number, offset?: number, where?: string): Promise<SampleData>
  executeReadQuery(query: string, params?: any[]): Promise<any[]>
} 