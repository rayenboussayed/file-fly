import { Controller, Get, Query, Request } from '@nestjs/common';
import { AppService } from './app.service.js';
import { BaseSchema, type BaseType } from './app.schema.js';
import type { FastifyRequest } from 'fastify';
import { request as abc, request } from 'undici';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  main(
    @Request() request: FastifyRequest,
    @Query({ schema: BaseSchema }) query: BaseType,
  ) {
    abc(query.source, {
      method: "GET",
      headers: {
        ...request.headers,
      },
    });
  }
}
