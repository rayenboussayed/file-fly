import { describe, expect, it } from 'vitest';

import { telemetryEnabled } from './telemetry.js';

describe('telemetryEnabled', () => {
  it('is true only for production builds with a non-blank endpoint', () => {
    expect(telemetryEnabled({ PROD: true, VITE_OTEL_OTLP_ENDPOINT: 'http://localhost:4318' })).toBe(true);
    expect(telemetryEnabled({ PROD: true, VITE_OTEL_OTLP_ENDPOINT: '  http://localhost:4318  ' })).toBe(true);
    expect(telemetryEnabled({ PROD: true, VITE_OTEL_OTLP_ENDPOINT: '' })).toBe(false);
    expect(telemetryEnabled({ PROD: true, VITE_OTEL_OTLP_ENDPOINT: ' '.repeat(3) })).toBe(false);
    expect(telemetryEnabled({ PROD: true })).toBe(false);
    expect(telemetryEnabled({ PROD: false, VITE_OTEL_OTLP_ENDPOINT: 'http://localhost:4318' })).toBe(false);
    expect(telemetryEnabled({})).toBe(false);
    expect(telemetryEnabled({ PROD: true, VITE_OTEL_OTLP_ENDPOINT: 4318 })).toBe(false);
  });
});
