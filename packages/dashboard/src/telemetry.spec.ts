import { describe, expect, it } from 'vitest';

import { isTelemetryEnabled } from './telemetry.js';

describe('isTelemetryEnabled', () => {
  it('is true only for production builds with a non-blank endpoint', () => {
    expect(isTelemetryEnabled({ PROD: true, VITE_OTEL_OTLP_ENDPOINT: 'http://localhost:4318' })).toBe(true);
    expect(isTelemetryEnabled({ PROD: true, VITE_OTEL_OTLP_ENDPOINT: '  http://localhost:4318  ' })).toBe(true);
    expect(isTelemetryEnabled({ PROD: true, VITE_OTEL_OTLP_ENDPOINT: '' })).toBe(false);
    expect(isTelemetryEnabled({ PROD: true, VITE_OTEL_OTLP_ENDPOINT: ' '.repeat(3) })).toBe(false);
    expect(isTelemetryEnabled({ PROD: true })).toBe(false);
    expect(isTelemetryEnabled({ PROD: false, VITE_OTEL_OTLP_ENDPOINT: 'http://localhost:4318' })).toBe(false);
    expect(isTelemetryEnabled({})).toBe(false);
    expect(isTelemetryEnabled({ PROD: true, VITE_OTEL_OTLP_ENDPOINT: 4318 })).toBe(false);
  });
});
