import 'reflect-metadata'
import { container } from './container.js'
import { METADATA_SERVICE, SAMPLER_SERVICE, SECURITY_SERVICE } from './tokens.js'
import { MetadataService } from '../../services/metadata/service.js'
import { SamplerService } from '../../services/sampler/service.js'
import { SecurityService } from '../../services/security/service.js'

// 注册服务为单例
container.registerSingleton(METADATA_SERVICE, MetadataService)
container.registerSingleton(SAMPLER_SERVICE, SamplerService)
container.registerSingleton(SECURITY_SERVICE, SecurityService)

export { container } 