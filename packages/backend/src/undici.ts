import path from 'node:path';
import {
  Agent,
  cacheStores,
  install,
  interceptors,
  setGlobalDispatcher,
} from 'undici';

import { CACHE_DIR, UNDICI_CACHE_FILE } from './constants/fs.js';
import { isProduction } from './environment.js';

const cacheLocation = path.join(CACHE_DIR, UNDICI_CACHE_FILE);
const cacheStore = new cacheStores.SqliteCacheStore({ location: cacheLocation });
const cacheInterceptor = interceptors.cache({ store: cacheStore });

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
}).compose(cacheInterceptor);

if (isProduction) setGlobalDispatcher(client);
install();
