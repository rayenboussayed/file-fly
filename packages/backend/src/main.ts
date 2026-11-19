import 'zod/compile';

import './undici.js';

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
import { Logger } from 'nestjs-pino';
import { z } from 'zod';
import { createSchema } from 'zod-openapi';

import * as AppHeaders from '@/constants/header.js';

import { AppModule } from './app.module.js';
import { configureFastify } from './bootstrap.js';
import { environment, isProduction } from './environment.js';
import { bootstrapLogger } from './logging/bootstrap-logger.js';

const logger = bootstrapLogger;

// A stray rejection must never kill the media streaming process.
process.on('unhandledRejection', (reason) => {
  logger.error(`unhandledRejection: ${String(reason)}`);
});
process.on('uncaughtException', (error) => {
  logger.error(`uncaughtException: ${error.stack ?? String(error)}`);
});

/** Boots the Nest application: pino logging, metrics shutdown hooks, CORS/security headers in production, Swagger, and the listener. */
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    // The JSON `/build` routes are the first parsed-body endpoints; pin an
    // explicit cap instead of inheriting Fastify's 1 MiB default.
    new FastifyAdapter({ bodyLimit: 16 * 1024 * 1024, trustProxy: environment.TRUST_PROXY === true }),
    { bufferLogs: true },
  );
  // Route Nest's built-in Logger through pino (request context included).
  app.useLogger(app.get(Logger));
  // Flushes pending metrics on SIGTERM (metrics.db) and lets Nest close
  // servers cleanly instead of the default blunt exit.
  app.enableShutdownHooks();

  await configureFastify(app.getHttpAdapter().getInstance());

  if (isProduction) {
    app.enableCors({
      credentials: true,
      exposedHeaders: Object.values(AppHeaders),
      // Unset CORS_ORIGIN = cross-origin browser reads disabled, not wide open.
      origin: environment.CORS_ORIGIN ?? false,
    });
    app.useSecurityHeaders();
    app.enableCsrfProtection();
  }

  swagger(app);
  await app.listen(process.env.PORT ?? 3000);
}

/**
 * Mounts Swagger/OpenAPI docs at `/api` with a zod-to-OpenAPI schema converter.
 * @param app - The Nest application instance.
 */
function swagger(app: NestFastifyApplication) {
  const config = new DocumentBuilder()
    .setTitle('file-fly')
    .setDescription('Stream-first file and media processing')
    .setVersion('0.0.1')
    .addTag('media')
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
