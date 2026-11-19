<a name="loadPdq"></a>

## loadPdq ⇒
Loads and initializes the PDQ perceptual-hash class, caching it for reuse.

This function takes no parameters.

The `pdq-wasm` ESM entry (`dist/esm/index.js`) cannot locate its `.wasm`
file under Node, so the working CommonJS entry is loaded on purpose with
`createRequire(import.meta.url)('pdq-wasm')` instead of a static ESM import.
The first call requires the package and awaits `PDQ.init()`; concurrent
first calls share a single in-flight initialization promise, and later
calls return the cached class. The memoized entry is dropped if
initialization rejects, so a failed attempt is retried on the next call.

**Kind**: global constant  
**Returns**: The initialized `PDQ` class.  
src: packages/backend/src/utils/pdq.ts:25  
dist: packages/backend/dist/utils/pdq.js:4
