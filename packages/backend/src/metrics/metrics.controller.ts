import {
  Controller,
  Get,
  Headers,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { timingSafeEqual } from 'node:crypto';

import { environment, isProduction } from '@/environment.js';

import { MetricsService, type MetricsSnapshot } from './metrics.service.js';

/**
 * Constant-time comparison of bearer tokens.
 * @param actual - The `Authorization` header sent by the client, if any.
 * @param expected - The token the server requires.
 * @returns True when both strings are byte-equal.
 */
const bearerMatches = (actual: string | undefined, expected: string): boolean => {
  const expectedHeader = `Bearer ${expected}`;
  if (actual === undefined || actual.length !== expectedHeader.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expectedHeader));
};

/** Read-only metrics and liveness endpoints for the dashboard. */
@ApiTags('metrics')
@Controller()
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  /**
   * Liveness probe for Docker HEALTHCHECK and uptime checks.
   * @returns Status, uptime in seconds and the current timestamp.
   */
  @Get('health')
  healthGet() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
    };
  }

  /**
   * Full metrics payload for the dashboard.
   *
   * Requires `METRICS_TOKEN` as a bearer token; in production, a missing
   * `METRICS_TOKEN` disables the route (503) so per-IP data is never public.
   * @param authorization - The `Authorization` header, if present.
   * @returns The aggregated metrics snapshot.
   * @throws ServiceUnavailableException Production is missing `METRICS_TOKEN`.
   * @throws UnauthorizedException The bearer token is missing or wrong.
   */
  @Get('metrics')
  metricsGet(@Headers('authorization') authorization?: string): MetricsSnapshot {
    const token = environment.METRICS_TOKEN;
    if (token) {
      if (!bearerMatches(authorization, token)) {
        throw new UnauthorizedException('Invalid metrics token');
      }
    } else if (isProduction) {
      // Loud by design: refusing beats leaking internal IPs and volumes.
      throw new ServiceUnavailableException('METRICS_TOKEN must be set to expose /metrics in production');
    }
    return this.metrics.snapshot();
  }
}
