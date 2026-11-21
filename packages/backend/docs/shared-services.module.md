<a name="SharedServicesModule"></a>

## SharedServicesModule
Provides the request-agnostic services every feature module needs once. The
ClamAV client is memoized per process and CLS access is request-scoped, so a
single instance serves all features. WorkerService stays per-feature: it owns
a worker-concurrency budget and an in-flight map that must not be shared.

**Kind**: global variable  
src: packages/backend/src/shared-services.module.ts:18  
dist: packages/backend/dist/shared-services.module.js:11
