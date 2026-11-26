// eslint-disable-next-line n/no-extraneous-import -- fastify ships with @nestjs/platform-fastify, as elsewhere in the repo
import type { FastifyReply, FastifyRequest } from 'fastify';

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

import { AntiVirusService } from '@/services/anti-virus.service.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';

import { MetricsService } from './metrics.service.js';

/**
Routes excluded from instrumentation to avoid self-observation feedback.
 */
const EXCLUDED_ROUTES = new Set(['/health', '/metrics']);

/**
 * Turns a comma-separated or single-value header into a non-negative integer.
 * @param value - Raw header value from a Fastify request or reply.
 * @returns Parsed size in bytes, or 0 when absent or invalid.
 */
const headerNumber = (value: number | string | string[] | undefined): number => {
  if (Array.isArray(value)) [value] = value;
  const text = String(value ?? '0').trim();
  // Keep base-10 parseInt semantics: a numeric prefix is accepted even when the
  // rest of the header is junk; Number() would turn that same value into NaN.
  const prefix = /^[+-]?\d+/.exec(text);
  const parsed = prefix ? Number(prefix[0]) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/**
 * Derives the scan verdict from the data already on CLS and the status code.
 * @param fileScan - The scan verdict recorded on CLS, when present.
 * @param isAntiVirusEnabled - Whether the scanner perimeter is active.
 * @param status - Status code sent to the client.
 * @returns The verdict to record, or undefined for non-scanner routes.
 */
const scanOutcome = (
  fileScan: undefined | { isInfected: boolean },
  isAntiVirusEnabled: boolean,
  status: number,
): 'blocked' | 'clean' | 'infected' | undefined => {
  if (fileScan) return fileScan.isInfected ? 'infected' : 'clean';
  if (!isAntiVirusEnabled) return undefined;
  return status === 413 || status === 422 ? 'blocked' : undefined;
};

/**
 * Records one metric per completed HTTP request.
 *
 * Bytes are taken from CLS (written by the stream meters) and fall back to the
 * `content-length` headers otherwise; an empty streamed response still counts
 * as a file out (the meter records 0 bytes, not a missing value). `filesOut`
 * therefore keys off the CLS meter being installed, not the byte count.
 * Self-instrumenting routes (`/metrics`, `/health`) are skipped. Registered
 * after `ClsInterceptor`, so the CLS context exists.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    private readonly cls: NormalizedClsService,
    private readonly metrics: MetricsService,
    private readonly antiVirus: AntiVirusService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();

    const route = request.routeOptions.url ?? 'unmatched';
    if (EXCLUDED_ROUTES.has(route)) return next.handle();

    this.metrics.inflightInc();
    const start = performance.now();

    reply.raw.once('close', () => {
      const status = reply.raw.statusCode;
      const bytesOut = this.cls.bytesOut().get() ?? headerNumber(reply.raw.getHeader('content-length'));
      const bytesIn = this.cls.bytesIn().get()
        ?? headerNumber(request.headers['content-length']);
      this.metrics.record({
        bytesIn,
        bytesOut,
        cacheOutcome: this.cls.cacheOutcome().get(),
        durationMs: performance.now() - start,
        filesIn: this.cls.sourceDirection().get() ? 1 : 0,
        filesOut: this.cls.bytesOut().get() === undefined ? 0 : 1,
        ip: request.ip,
        route,
        scan: scanOutcome(this.cls.fileScan().get(), this.antiVirus.enabled(), status),
        status,
      });
      this.metrics.inflightDec();
    });

    return next.handle();
  }
}
