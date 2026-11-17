import { Module } from '@nestjs/common';

import { MetricsController } from './metrics.controller.js';
import { MetricsService } from './metrics.service.js';

/** Metrics store, read endpoints and provider exports for the app module. */
@Module({
  controllers: [MetricsController],
  exports: [MetricsService],
  providers: [MetricsService],
})
export class MetricsModule {}
