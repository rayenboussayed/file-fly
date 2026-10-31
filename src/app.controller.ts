import type { FastifyRequest } from 'fastify';

import { Controller, Get, Query, Request } from '@nestjs/common';
import { request as abc, request } from 'undici';

import { BaseSchema, type BaseType } from './app.schema.js';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  main(
    @Request() request: FastifyRequest,
    @Query({ schema: BaseSchema }) query: BaseType,
  ) {
    abc(query.source, {
      headers: {
        ...request.headers,
      },
      method: "GET",
    });
  }
}
