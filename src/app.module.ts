import type { FastifyReply, FastifyRequest } from 'fastify';

import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CLS_REQ, CLS_RES, ClsInterceptor, ClsModule } from 'nestjs-cls';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { isProduction } from './environment.js';
import { FileParserInterceptor } from './interceptors/file-parser.interceptor.js';
import { AudioModule } from './resources/audio/audio.module.js';
import { ImageModule } from './resources/image/image.module.js';
import { VideoModule } from './resources/video/video.module.js';
import { CacheJanitorService } from './services/cache-janitor.service.js';
import { FileTypeService } from './services/file-type.service.js';
import { NormalizedClsService } from './services/normalized-cls.service.js';
import { WorkerService } from './services/worker.service.js';

@Module({
  controllers: [AppController],
  imports: [
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
          const response = http.getRequest<FastifyReply>();
          cls.setIfUndefined(CLS_RES, response);
        },
      },
    }),
    AudioModule,
    ImageModule,
    VideoModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ClsInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: FileParserInterceptor,
    },
    AppService,
    CacheJanitorService,
    FileTypeService,
    NormalizedClsService,
    WorkerService,
  ],
})
export class AppModule {}
