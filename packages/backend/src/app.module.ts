// eslint-disable-next-line n/no-extraneous-import
import type { FastifyReply, FastifyRequest } from 'fastify';

import { Injectable, Module, OnApplicationShutdown, RequestMethod } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CLS_REQ, CLS_RES, ClsInterceptor, ClsModule } from 'nestjs-cls';
import { OpenTelemetryModule } from 'nestjs-otel';
import { LoggerModule } from 'nestjs-pino';

import { AppController } from './app.controller.js';
import { otelSDK, otelTracingEnabled } from './app.tracing.js';
import { DashboardStaticModule } from './dashboard-static.module.js';
import { environment, isProduction } from './environment.js';
import { buildPinoHttpOptions } from './logging/pino-options.js';
import { MetricsInterceptor } from './metrics/metrics.interceptor.js';
import { MetricsModule } from './metrics/metrics.module.js';
import { AudioModule } from './resources/audio/audio.module.js';
import { CsvModule } from './resources/csv/csv.module.js';
import { DocxModule } from './resources/docx/docx.module.js';
import { FontModule } from './resources/font/font.module.js';
import { ImageModule } from './resources/image/image.module.js';
import { ModelModule } from './resources/model/model.module.js';
import { PdfModule } from './resources/pdf/pdf.module.js';
import { PptxModule } from './resources/pptx/pptx.module.js';
import { VideoModule } from './resources/video/video.module.js';
import { XlsxModule } from './resources/xlsx/xlsx.module.js';
import { AntiVirusService } from './services/anti-virus.service.js';
import { CacheJanitorService } from './services/cache-janitor.service.js';
import { FileTypeService } from './services/file-type.service.js';
import { NormalizedClsService } from './services/normalized-cls.service.js';
import { WorkerService } from './services/worker.service.js';

/** Flushes pending spans and host metrics when Nest closes on SIGTERM; a no-op when telemetry is disabled. */
@Injectable()
class OtelShutdownService implements OnApplicationShutdown {
  /** @returns Settles once the OpenTelemetry SDK has flushed and released resources. */
  async onApplicationShutdown(): Promise<void> {
    if (otelTracingEnabled && otelSDK) {
      await otelSDK.shutdown();
    }
  }
}

/** Root module: imports every feature module, global metrics/logging and the static dashboard. */
@Module({
  controllers: [AppController],
  imports: [
    LoggerModule.forRoot({
      // middie strips the mount path before pino-http sees it, so route-aware
      // exclusion must happen at the Nest middleware layer, not autoLogging.
      exclude: [{ method: RequestMethod.ALL, path: '/health' }],
      pinoHttp: buildPinoHttpOptions({
        isProduction,
        level: environment.LOG_LEVEL,
      }),
    }),
    // Host metrics (CPU, memory, event loop) flow to the Prometheus exporter;
    // the tracing SDK itself lives in app.tracing.ts.
    OpenTelemetryModule.forRoot({ metrics: { hostMetrics: true } }),
    ClsModule.forRoot({
      global: true,
      interceptor: {
        debug: !isProduction,
        mount: true,
        saveCtx: true,
        setup(cls, context) {
          const http = context.switchToHttp();
          const request = http.getRequest<FastifyRequest>();
          cls.setIfUndefined(CLS_REQ, request);
          const response = http.getResponse<FastifyReply>();
          cls.setIfUndefined(CLS_RES, response);
        },
      },
    }),
    AudioModule,
    CsvModule,
    DocxModule,
    FontModule,
    ModelModule,
    PptxModule,
    PdfModule,
    DashboardStaticModule,
    ImageModule,
    MetricsModule,
    VideoModule,
    XlsxModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ClsInterceptor,
    },
    {
      // After ClsInterceptor: CLS is required to read the request context.
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
    OtelShutdownService,
    AntiVirusService,
    CacheJanitorService,
    FileTypeService,
    NormalizedClsService,
    WorkerService,
  ],
})
export class AppModule {}
