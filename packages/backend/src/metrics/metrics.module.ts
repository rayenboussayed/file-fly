import { Module } from '@nestjs/common';

import { MetricsController } from './metrics.controller.js';
import { MetricsService } from './metrics.service.js';

/**
Metrics module: counters/histograms to SQLite and the `GET /metrics` endpoint.
 */
@Module({
  controllers: [MetricsController],
  exports: [MetricsService],
  providers: [MetricsService],
})
export class MetricsModule {}
