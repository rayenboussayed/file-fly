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
import { createSchema } from 'zod-openapi';

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

  if (isProduction) {
    app.enableCors({
      credentials: true,
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
 * @param app
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
      const converted = createSchema(schema as never, {
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
