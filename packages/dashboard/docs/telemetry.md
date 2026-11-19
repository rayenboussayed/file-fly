<a name="telemetryEnabled"></a>

## telemetryEnabled(env) ⇒ <code>boolean</code>
Whether browser telemetry should start. Pure function over the build-time
environment so it can be unit-tested without loading the SDK: enabled only
in production builds with `VITE_OTEL_OTLP_ENDPOINT` set.

**Kind**: global function  
**Returns**: <code>boolean</code> - True when the production build declares an OTLP endpoint.  

| Param | Type | Description |
| --- | --- | --- |
| env | <code>Record&lt;string, unknown&gt;</code> | The Vite environment record (`import.meta.env`). |

src: packages/dashboard/src/telemetry.ts:30  
