import { Global, Module } from '@nestjs/common';

import { AntiVirusService } from '@/services/anti-virus.service.js';
import { FileTypeService } from '@/services/file-type.service.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';

/**
 * Provides the request-agnostic services every feature module needs once. The
 * ClamAV client is memoized per process and CLS access is request-scoped, so a
 * single instance serves all features. WorkerService stays per-feature: it owns
 * a worker-concurrency budget and an in-flight map that must not be shared.
 */
@Global()
@Module({
  exports: [AntiVirusService, FileTypeService, NormalizedClsService],
  providers: [AntiVirusService, FileTypeService, NormalizedClsService],
})
export class SharedServicesModule {}
