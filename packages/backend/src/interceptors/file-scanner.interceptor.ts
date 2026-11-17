import {
  CallHandler,
  Injectable,
  InternalServerErrorException,
  Logger,
  NestInterceptor,
} from '@nestjs/common';

import { AntiVirusService } from '@/services/anti-virus.service.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';

import { openMediaSource } from '../utils/open-source.js';

/**
 * Scans the incoming media stream for viruses before the parser runs.
 *
 * Must be bound BEFORE `FileParserInterceptor` (and before any other consumer
 * of the source stream) so an infected upload is rejected with `422` before
 * the signature probe ever sees a byte of it.
 *
 * CLS open-source contract: this interceptor opens the source itself through
 * `openMediaSource`, which is idempotent — binding it before the parser means
 * the parser's own open is a no-op. When the virus scanner is disabled (no
 * `CLAMAV_HOST`/`CLAMAV_PORT` configured) this interceptor passes media
 * through untouched, after logging a single warning per instance.
 *
 * Failure semantics: `AntiVirusService.scan` rejects with a `413` when the
 * payload exceeds `CLAMAV_MAX_BYTES`, a `422` when the stream is infected,
 * and a `503` when clamd is unreachable or errors; those statuses are set by
 * the service and propagate out of this interceptor as-is. `next.handle()` is
 * never reached for rejected media, so no downstream interceptor or handler
 * runs on a failed scan.
 *
 * The scan buffers the (capped) payload in memory and replaces the CLS
 * source with a replay `Readable`, so the pipeline downstream reads the same
 * bytes as if nothing happened.
 */
@Injectable()
export class FileScannerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(FileScannerInterceptor.name);
  private warned = false;

  constructor(
    private readonly cls: NormalizedClsService,
    private readonly antiVirusService: AntiVirusService,
  ) {}

  async intercept(_: never, next: CallHandler) {
    // Method-less requests (e.g. synthetic invocations) carry no media to scan.
    if (!this.cls.request()?.method) {
      return next.handle();
    }

    if (!this.antiVirusService.enabled()) {
      if (!this.warned) {
        this.warned = true;
        this.logger.warn('CLAMAV_HOST/CLAMAV_PORT not set; virus scanning is disabled');
      }
      return next.handle();
    }

    await openMediaSource(this.cls);
    const source = this.cls.sourceStream().get();
    if (!source) {
      throw new InternalServerErrorException('FileScannerInterceptor requires an opened source stream (call openMediaSource first)');
    }

    await this.antiVirusService.scan({ stream: source });

    return next.handle();
  }
}
