## Members

<dl>
<dt><a href="#OtelShutdownService">OtelShutdownService</a></dt>
<dd><p>Flushes pending spans and host metrics when Nest closes on SIGTERM; a no-op when telemetry is disabled.</p>
</dd>
<dt><a href="#AppModule">AppModule</a></dt>
<dd><p>Root module: imports every feature module, global metrics/logging and the static dashboard.</p>
</dd>
</dl>

<a name="OtelShutdownService"></a>

## OtelShutdownService
Flushes pending spans and host metrics when Nest closes on SIGTERM; a no-op when telemetry is disabled.

**Kind**: global variable  
src: packages/backend/src/app.module.ts:35  
dist: packages/backend/dist/app.module.js:34
<a name="OtelShutdownService+onApplicationShutdown"></a>

### otelShutdownService.onApplicationShutdown() ⇒ <code>Promise&lt;void&gt;</code>
**Kind**: instance method of [<code>OtelShutdownService</code>](#OtelShutdownService)  
**Returns**: <code>Promise&lt;void&gt;</code> - Settles once the OpenTelemetry SDK has flushed and released resources.  
src: packages/backend/src/app.module.ts:37  
dist: packages/backend/dist/app.module.js:35
<a name="AppModule"></a>

## AppModule
Root module: imports every feature module, global metrics/logging and the static dashboard.

**Kind**: global variable  
src: packages/backend/src/app.module.ts:106  
dist: packages/backend/dist/app.module.js:44
