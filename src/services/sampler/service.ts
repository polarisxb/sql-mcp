import { Injectable, Inject } from '../../core/di/decorators.js'
import { DatabaseConnector } from '../../core/types/connector.js'
import { SampleData } from '../../core/types/database.js'
import { ISamplerService } from './interface.js'
import { ISecurityService } from '../security/interface.js'
import { DATABASE_CONNECTOR, SECURITY_SERVICE } from '../../core/di/tokens.js'

@Injectable()
export class SamplerService implements ISamplerService {
  constructor(
    @Inject(DATABASE_CONNECTOR) private connector: DatabaseConnector,
    @Inject(SECURITY_SERVICE) private securityService: ISecurityService
  ) {}
  
  async getSampleData(
    tableName: string,
    limit: number = 10,
    offset: number = 0,
    where?: string
  ): Promise<SampleData> {
    this.securityService.validateIdentifier(tableName)
    if (where) this.securityService.validateWhereClause(where)
    const actualLimit = Math.min(Math.max(limit, 1), 100)
    const data = await this.connector.getSampleData(tableName, actualLimit, offset, where)
    return this.securityService.sanitizeSampleData(data)
  }
  
  async executeReadQuery(query: string, params?: any[]): Promise<any[]> {
    this.securityService.validateReadOnlyQuery(query)
    const results = await this.connector.executeReadQuery(query, params)
    return this.securityService.sanitizeQueryResults(results)
  }
} 