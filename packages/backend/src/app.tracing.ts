import { FastifyOtelInstrumentation } from '@fastify/otel';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { B3Propagator } from '@opentelemetry/propagator-b3';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

import { environment } from './environment.js';

/**
 * The OTLP/HTTP traces endpoint. Prefers `OTEL_TRACE_EXPORTER_URL`, falls back
 * to the standard `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`. When neither is set,
 * telemetry stays disabled entirely (the SDK is never constructed, so nothing
 * binds the metrics port and e2e/unit boots emit nothing).
 */
const traceEndpoint =
  environment.OTEL_TRACE_EXPORTER_URL ??
  process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;

/**
Whether OpenTelemetry starts on boot. Endpoint-gated, never implicit.
 */
const isOtelTracingEnabled = traceEndpoint !== undefined && traceEndpoint.trim().length > 0;

export { isOtelTracingEnabled as otelTracingEnabled };

const SERVICE_VERSION = process.env.npm_package_version ?? '0.0.1';

/**
 * The process-wide OpenTelemetry SDK, shaped like the reference Fastify
 * setup: W3C + B3 + baggage propagation, batching OTLP exporter, host metrics
 * on the Prometheus exporter and auto-instrumented HTTP / Nest / pino /
 * undici traffic. Constructed only when telemetry is enabled (the Prometheus
 * exporter binds its port in its constructor) — start it before
 * `NestFactory.create` so Fastify's plugin registration is captured; see
 * `main.ts`.
 */
export const otelSDK = isOtelTracingEnabled
  ? new NodeSDK({
      contextManager: new AsyncLocalStorageContextManager(),
      instrumentations: [
        getNodeAutoInstrumentations(),
        new FastifyOtelInstrumentation({
          // The liveness probe would otherwise flood every collector with spans.
          ignorePaths: '/health',
          recordExceptions: true,
          registerOnInitialization: true,
        }),
      ],
      metricReaders: [
        new PrometheusExporter({
          port: environment.OTEL_METRICS_PORT,
        }),
      ],
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: 'file-fly-backend',
        [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
      }),
      textMapPropagator: new CompositePropagator({
        propagators: [
          new W3CTraceContextPropagator(),
          new W3CBaggagePropagator(),
          new B3Propagator(),
        ],
      }),
      traceExporter: new OTLPTraceExporter({
        // traceEndpoint is defined here (isOtelTracingEnabled); the fallback is unreachable.
        url: traceEndpoint,
      }),
    })
  : undefined;
