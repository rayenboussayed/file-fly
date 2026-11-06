import 'zod/compile';

import './undici.js';

// eslint-disable-next-line n/no-extraneous-import
import type { FastifyInstance } from 'fastify';

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import {
  DocumentBuilder,
  SwaggerDocumentOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import { supportedMimeTypes } from 'file-type';
import { z } from 'zod';
import { createSchema } from 'zod-openapi';

import * as AppHeaders from '@/constants/header.js';

import { AppModule } from './app.module.js';
import { environment, isProduction } from './environment.js';

/**
 *
 */
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  fastify(app.getHttpAdapter().getInstance());

  if (isProduction) {
    app.enableCors({
      credentials: true,
      exposedHeaders: Object.values(AppHeaders),
      origin: environment.CORS_ORIGIN,
    });
    app.useSecurityHeaders();
    app.enableCsrfProtection();
  }

  swagger(app);
  await app.listen(process.env.PORT ?? 3000);
}

/**
 *
 * @param instance Description.
 */
function fastify(instance: FastifyInstance) {
  instance.addContentTypeParser(
    [...supportedMimeTypes, 'application/octet-stream'],
    (request, _, done) => {
      if (request.method.toUpperCase() === 'GET') return done(null, request.raw);
      const contentLength = Number.parseInt(
        request.headers['content-length']?.trim() ?? '0',
      );
      return contentLength > 0
        ? done(null)
        : done(
            new Error(
              'content-length header must be set and be greater than 0',
            ),
          );
    },
  );
}

/**
 *
 * @param app Description.
 */
function swagger(app: NestFastifyApplication) {
  const config = new DocumentBuilder()
    .setTitle('Cats example')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .addTag('cats')
    .build();

  const documentOptions: SwaggerDocumentOptions = {
    standardSchemaConverter: (schema, { schemaType }) => {
      const converted = createSchema(schema as z.ZodType, {
        io: schemaType,
        openapiVersion: '3.0.0',
      });
      return { components: converted.components, schema: converted.schema };
    },
  };

  const documentFactory = () =>
    SwaggerModule.createDocument(app, config, documentOptions);
  SwaggerModule.setup('swagger', app, documentFactory, {
    jsonDocumentUrl: 'swagger/json',
  });
}

await bootstrap();
