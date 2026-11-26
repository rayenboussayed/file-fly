import fastifyStatic from '@fastify/static';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import fs from 'node:fs';
import path from 'node:path';

import { environment } from './environment.js';

/**
 * Client routes of the SPA that do not map to a file in the build output and
 * therefore need an explicit alias to `index.html`. Keep this in sync with
 * `packages/dashboard/src/routes/` (currently `/` and `/ip/:ip`). The build's
 * index.html itself is served at `/` by the static plugin.
 */
const CLIENT_ROUTE_ALIASES = ['/ip/:ip'] as const;

/**
 * Serves the prebuilt dashboard at `/` when its build output exists.
 *
 * `wildcard: false` registers each built file as its own exact route, so the
 * API routes are never shadowed and only files that exist in the dist folder
 * are served. Deep client routes are served via `CLIENT_ROUTE_ALIASES`.
 * Everything else falls through to Nest's own 404 handler unchanged. A
 * missing dist folder logs a warning and serves no dashboard.
 */
@Injectable()
export class DashboardStaticService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DashboardStaticService.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  /**
   * Registers the static routes and the deep-link aliases.
   * @returns Nothing.
   */
  async onApplicationBootstrap(): Promise<void> {
     
    const instance = this.adapterHost.httpAdapter.getInstance() as import('fastify').FastifyInstance;
    const root = path.resolve(environment.DASHBOARD_DIR);
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- DASHBOARD_DIR is operator env config, not request input
    if (!fs.existsSync(path.join(root, 'index.html'))) {
      this.logger.warn(`DASHBOARD_DIR ${root} has no index.html; the dashboard is not served`);
      return;
    }
    await instance.register(fastifyStatic, {
      index: ['index.html'],
      root,
      wildcard: false,
    });
    for (const alias of CLIENT_ROUTE_ALIASES) {
      instance.get(alias, (_request, reply) => reply.sendFile('index.html'));
    }
  }
}
