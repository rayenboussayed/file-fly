import path from 'node:path';
import {
  Agent,
  cacheStores,
  install,
  interceptors,
  setGlobalDispatcher,
} from 'undici';

import { CACHE_DIR } from './constants/fs.js';
import { isProduction } from './environment.js';

const client = new Agent({
  bodyTimeout: 30_000,
  connect: {
    keepAlive: true,
    keepAliveInitialDelay: 1000,
    timeout: 10_000,
  },
  connections: 100,
  headersTimeout: 10_000,
  keepAliveMaxTimeout: 600_000,
  keepAliveTimeout: 60_000,
  pipelining: 10,
}).compose(
  interceptors.cache({
    store: new cacheStores.SqliteCacheStore({
      location: path.join(CACHE_DIR, 'undici-cache.db'),
    }),
  }),
);

if (isProduction) setGlobalDispatcher(client);
install();
