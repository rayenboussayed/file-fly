import path from 'node:path';
import {
  Agent,
  cacheStores,
  install,
  interceptors,
  setGlobalDispatcher,
} from 'undici';
import { isProduction } from './environment.js';
import { CACHE_DIR } from './constant.js';

const client = new Agent({
  connections: 100,
  pipelining: 10,
  keepAliveTimeout: 60_000,
  keepAliveMaxTimeout: 600_000,
  connect: {
    timeout: 10_000,
    keepAlive: true,
    keepAliveInitialDelay: 1000,
  },
  bodyTimeout: 30_000,
  headersTimeout: 10_000,
}).compose(
  interceptors.cache({
    store: new cacheStores.SqliteCacheStore({
      location: path.join(CACHE_DIR, 'undici-cache.db'),
    }),
  }),
);

if (isProduction) setGlobalDispatcher(client);
install();
