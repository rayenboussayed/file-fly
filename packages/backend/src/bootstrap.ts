// eslint-disable-next-line n/no-extraneous-import
import type { FastifyInstance } from 'fastify';

import { BadRequestException } from '@nestjs/common';
import { supportedMimeTypes } from 'file-type';

import { registerBasicAuth } from './basic-auth.js';

/**
 * Configures the Fastify instance with everything the app needs at the HTTP
 * edge, shared by the production bootstrap (`main.ts`) and the e2e harness
 * (`test/helpers.ts`) so the two can never drift:
 *
 * - the media content-type parsers that accept uploads as raw streams,
 * - the basic-auth perimeter (a no-op unless both credentials are configured).
 * @param instance - The Fastify instance to configure.
 */
export async function configureFastify(instance: FastifyInstance): Promise<void> {
  instance.addContentTypeParser(
    [...supportedMimeTypes, 'application/octet-stream', 'text/csv', 'model/gltf+json'],
    (request, _, done) => {
      if (request.method.toUpperCase() === 'GET') return done(null, request.raw);
      const contentLength = Number.parseInt(
        request.headers['content-length']?.trim() ?? '0',
      );
      return contentLength > 0
        ? done(null)
        : done(
            new BadRequestException(
              'content-length header must be set and be greater than 0',
            ),
          );
    },
  );
  await registerBasicAuth(instance);
}
