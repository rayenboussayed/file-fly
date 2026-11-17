import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocked = vi.hoisted(() => ({
  isProduction: false,
  METRICS_TOKEN: undefined as string | undefined,
}));

vi.mock('@/environment.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/environment.js')>();
  // One mutable environment object for all tests; the controller reads
  // METRICS_TOKEN off it per request, so per-test mutation stays visible.
  const environment = { ...original.environment };
  return {
    ...original,
    environment,
    get isProduction() {
      return mocked.isProduction;
    },
  };
});

import { environment } from '@/environment.js';

import { MetricsController } from './metrics.controller.js';

const marker = { marker: 'snapshot' };

const makeController = () => {
  const metrics = { snapshot: () => marker as never };
  return new MetricsController(metrics as never);
};

describe('MetricsController', () => {
  beforeEach(() => {
    mocked.isProduction = false;
    environment.METRICS_TOKEN = undefined;
  });

  it('answers the snapshot in development without a token', () => {
    expect(makeController().metricsGet()).toBe(marker);
  });

  it('answers the snapshot in production with a matching bearer token', () => {
    mocked.isProduction = true;
    environment.METRICS_TOKEN = 'secret-token';
    expect(makeController().metricsGet('Bearer secret-token')).toBe(marker);
  });

  it('refuses with 401 when the bearer token is wrong or missing', () => {
    mocked.isProduction = true;
    environment.METRICS_TOKEN = 'secret-token';
    const controller = makeController();
    expect(() => controller.metricsGet('Bearer wrong-token')).toThrow(UnauthorizedException);
    expect(() => controller.metricsGet()).toThrow(UnauthorizedException);
    expect(() => controller.metricsGet('bearer secret-token')).toThrow(UnauthorizedException);
    expect(() => controller.metricsGet('Bearer secret-token ')).toThrow(UnauthorizedException);
  });

  it('refuses with 503 in production when METRICS_TOKEN is unset', () => {
    mocked.isProduction = true;
    expect(() => makeController().metricsGet()).toThrow(ServiceUnavailableException);
  });

  it('requires the token even in development when one is configured', () => {
    environment.METRICS_TOKEN = 'dev-token';
    const controller = makeController();
    expect(() => controller.metricsGet()).toThrow(UnauthorizedException);
    expect(controller.metricsGet('Bearer dev-token')).toBe(marker);
  });

  it('answers health without any authentication', () => {
    mocked.isProduction = true;
    const health = makeController().healthGet();
    expect(health.status).toBe('ok');
    expect(typeof health.uptimeSeconds).toBe('number');
    expect(typeof health.timestamp).toBe('string');
  });
});
