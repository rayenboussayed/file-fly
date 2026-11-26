## Constants

<dl>
<dt><a href="#traceEndpoint">traceEndpoint</a></dt>
<dd><p>The OTLP/HTTP traces endpoint. Prefers <code>OTEL_TRACE_EXPORTER_URL</code>, falls back
to the standard <code>OTEL_EXPORTER_OTLP_TRACES_ENDPOINT</code>. When neither is set,
telemetry stays disabled entirely (the SDK is never constructed, so nothing
binds the metrics port and e2e/unit boots emit nothing).</p>
</dd>
<dt><a href="#isOtelTracingEnabled">isOtelTracingEnabled</a></dt>
<dd><p>Whether OpenTelemetry starts on boot. Endpoint-gated, never implicit.</p>
</dd>
<dt><a href="#otelSDK">otelSDK</a></dt>
<dd><p>The process-wide OpenTelemetry SDK, shaped like the reference Fastify
setup: W3C + B3 + baggage propagation, batching OTLP exporter, host metrics
on the Prometheus exporter and auto-instrumented HTTP / Nest / pino /
undici traffic. Constructed only when telemetry is enabled (the Prometheus
exporter binds its port in its constructor) — start it before
<code>NestFactory.create</code> so Fastify&#39;s plugin registration is captured; see
<code>main.ts</code>.</p>
</dd>
</dl>

<a name="traceEndpoint"></a>

## traceEndpoint
The OTLP/HTTP traces endpoint. Prefers `OTEL_TRACE_EXPORTER_URL`, falls back
to the standard `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`. When neither is set,
telemetry stays disabled entirely (the SDK is never constructed, so nothing
binds the metrics port and e2e/unit boots emit nothing).

**Kind**: global constant  
src: packages/backend/src/app.tracing.ts:27  
dist: packages/backend/dist/app.tracing.js:12
<a name="isOtelTracingEnabled"></a>

## isOtelTracingEnabled
Whether OpenTelemetry starts on boot. Endpoint-gated, never implicit.

**Kind**: global constant  
src: packages/backend/src/app.tracing.ts:34  
dist: packages/backend/dist/app.tracing.js:14
<a name="otelSDK"></a>

## otelSDK
The process-wide OpenTelemetry SDK, shaped like the reference Fastify
setup: W3C + B3 + baggage propagation, batching OTLP exporter, host metrics
on the Prometheus exporter and auto-instrumented HTTP / Nest / pino /
undici traffic. Constructed only when telemetry is enabled (the Prometheus
exporter binds its port in its constructor) — start it before
`NestFactory.create` so Fastify's plugin registration is captured; see
`main.ts`.

**Kind**: global constant  
src: packages/backend/src/app.tracing.ts:49  
dist: packages/backend/dist/app.tracing.js:17
