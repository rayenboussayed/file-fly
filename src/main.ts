import 'zod/compile';
import './undici.js';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import {
  DocumentBuilder,
  SwaggerDocumentOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import { createSchema } from 'zod-openapi';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { environment, isDevelopment, isProduction } from './environment.js';

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
      return { schema: converted.schema, components: converted.components };
    },
  };

  const documentFactory = () =>
    SwaggerModule.createDocument(app, config, documentOptions);
  SwaggerModule.setup('swagger', app, documentFactory, {
    jsonDocumentUrl: 'swagger/json',
  });
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  if (isProduction) {
    app.enableCors({
      origin: environment.CORS_ORIGIN,
      credentials: true,
    });
    app.useSecurityHeaders();
    app.enableCsrfProtection();
  }

  swagger(app);
  await app.listen(process.env.PORT ?? 3000);
}

await bootstrap();
