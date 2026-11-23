import { trace } from '@opentelemetry/api';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  BatchSpanProcessor,
  WebTracerProvider,
} from '@opentelemetry/sdk-trace-web';
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { clientFn } from 'jutilities/runtime';

const SERVICE_NAME = 'file-fly-dashboard';
const SERVICE_VERSION = '0.0.1';
let started = false;

/**
 * Whether browser telemetry should start. Pure function over the build-time
 * environment so it can be unit-tested without loading the SDK: enabled only
 * in production builds with `VITE_OTEL_OTLP_ENDPOINT` set.
 * @param env - The Vite environment record (`import.meta.env`).
 * @returns True when the production build declares an OTLP endpoint.
 */
export function telemetryEnabled(env: Record<string, unknown>): boolean {
  return (
    env.PROD === true &&
    typeof env.VITE_OTEL_OTLP_ENDPOINT === 'string' &&
    env.VITE_OTEL_OTLP_ENDPOINT.trim().length > 0
  );
}

/**
 * Starts browser OpenTelemetry once and returns the client tracer. Safe to
 * call multiple times; subsequent calls reuse the provider. A no-op (returns
 * `undefined`) outside the browser or when telemetry is disabled by
 * {@link telemetryEnabled}.
 * @returns The client tracer, or undefined when disabled/not in a browser.
 */
/* v8 ignore start -- browser-only OTel boot; telemetryEnabled is unit-tested, the SDK wiring is exercised by the production build */
export const telemetry = clientFn(() => {
  if (started || !telemetryEnabled(import.meta.env)) {
    return undefined;
  }
  started = true;
  const rawEndpoint = import.meta.env.VITE_OTEL_OTLP_ENDPOINT;
  if (typeof rawEndpoint !== 'string') {
    return undefined;
  }
  let endpoint = rawEndpoint.trim();
  while (endpoint.endsWith('/')) {
    endpoint = endpoint.slice(0, -1);
  }
  const resource = resourceFromAttributes({
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: 'production',
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
  });
  const exporter = new OTLPTraceExporter({
    url: `${endpoint}/v1/traces`,
  });
  const provider = new WebTracerProvider({
    resource,
    spanProcessors: [new BatchSpanProcessor(exporter)],
  });
  provider.register({
    // ZoneContextManager keeps trace context correct across promises/timeouts
    // so a navigation's child fetch spans attach to the right parent.
    contextManager: new ZoneContextManager(),
    propagator: new W3CTraceContextPropagator(),
  });
  registerInstrumentations({
    instrumentations: [getWebAutoInstrumentations()],
  });
  // Browsers don't reliably let async work finish during `beforeunload`;
  // flush whenever the tab becomes hidden instead.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void provider.forceFlush();
    }
  });
  return trace.getTracer(SERVICE_NAME);
});
/* v8 ignore stop */
