import {
  Injectable,
  Logger,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import NodeClam from 'clamscan';
import { lazy } from 'jutilities/lazy';
import { Readable } from 'node:stream';

import { environment } from '@/environment.js';
import { bufferStream } from '@/utils/buffer.js';

import { NormalizedClsService } from './normalized-cls.service.js';

/**
 * Outcome of a ClamAV scan, mirrored into CLS for the clean case.
 */
export interface AntiVirusScanResult {
  /**
  True when ClamAV reported at least one known threat in the payload.
   */
  isInfected: boolean;
  /**
  Names of the threats reported by ClamAV; empty when the payload is clean.
   */
  viruses: string[];
}

/**
Shape of the answer produced by `clamd` for an INSTREAM request.
 */
interface ScanStreamResult {
  /**
  Always null for streamed scans.
   */
  file: null | string;
  /**
  clamd's verdict; null/undefined when clamd answers with ERROR or times out.
   */
  isInfected: boolean | null;
  /**
  Threat names reported by clamd; empty when the payload is clean.
   */
  viruses: string[];
}

/**
 * Builds the ClamAV client at most once per process; the initialized instance
 * is reused for every scan. The connection is tested with a ping at init time
 * (`bypassTest: false`), so an unreachable daemon rejects here and every caller
 * maps that to `ServiceUnavailableException`. A rejected initialization is
 * dropped from the memoization cache, so the next call retries from scratch.
 * @returns The initialized ClamAV client.
 */
const loadClamAv = lazy(async () => {
  const clam = new NodeClam();
  return clam.init({
    clamdscan: {
      active: true,
      bypassTest: false, // init() pings clamd; unreachable daemon -> reject -> 503
      host: environment.CLAMAV_HOST,
      localFallback: false,
      multiscan: true,
      port: environment.CLAMAV_PORT,
      reloadDb: false,
      timeout: environment.CLAMAV_TIMEOUT_MS,
      tls: false,
    },
    clamscan: { active: false },
    debugMode: false,
    preference: 'clamdscan',
    quarantineInfected: false,
    removeInfected: false,
    scanRecursively: false,
  });
});

/**
 * Scans the request payload with ClamAV (INSTREAM via `clamd`) before it is
 * processed further.
 *
 * When `CLAMAV_HOST` or `CLAMAV_PORT` is unset the integration is disabled and
 * callers are expected to skip it entirely (see {@link enabled}); the scan
 * itself assumes the daemon is configured and fails closed otherwise.
 *
 * A declared `content-length` above `CLAMAV_MAX_BYTES` is rejected with
 * `PayloadTooLargeException` before the body is read. Otherwise the body is
 * buffered once (bounded by `CLAMAV_MAX_BYTES`, same pattern as the OCR
 * pipeline) so the verdict can be delivered before any worker sees a single
 * byte; after a clean verdict the buffered body is replayed into the pipeline
 * as a fresh `Readable`. Buffering (rather than teeing) is deliberate: a tee
 * branch that nobody has consumed yet stalls at 16 KiB and starves the scan,
 * which deadlocks every body past the buffer high-water mark.
 *
 * The method fails closed: no outcome other than a conclusive "clean" answer
 * is ever reported as safe — infected payloads, inconclusive daemon replies,
 * oversized bodies and scanner errors all throw.
 */
@Injectable()
export class AntiVirusService {
  private readonly logger = new Logger(AntiVirusService.name);

  /**
   * Creates the service.
   * @param normalizedCls - CLS facade for the current request, source stream and scan verdict.
   */
  constructor(private readonly normalizedCls: NormalizedClsService) {}

  /**
   * Whether the ClamAV integration is configured. Read at call time so tests
   * can flip the environment between assertions.
   * @returns True when both `CLAMAV_HOST` and `CLAMAV_PORT` are set.
   */
  enabled(): boolean {
    return Boolean(environment.CLAMAV_HOST && environment.CLAMAV_PORT);
  }

  /**
   * Buffers the full payload (bounded by `CLAMAV_MAX_BYTES`), scans the
   * buffer with ClamAV, then replaces the CLS source stream with a replay
   * `Readable` so the downstream pipeline consumes the body as usual.
   *
   * On any failure the source stream is destroyed and the pipeline is never
   * started: fail-closed, like everywhere else in this service. After a
   * clean verdict CLS holds `{ isInfected: false, viruses: [] }` and the
   * replayed body is handed downstream.
   * @param options - Object carrying the request source stream to scan.
   * @param options.stream - The source stream (upload `request.raw` or the download body); replaced in CLS on success.
   * @returns The clean verdict, stored in CLS.
   * @throws PayloadTooLargeException When the payload exceeds `CLAMAV_MAX_BYTES`; clamd is never contacted.
   * @throws UnprocessableEntityException When clamd reports an infected payload.
   * @throws ServiceUnavailableException When clamd replies inconclusively, or the client cannot initialize/scan.
   */
  async scan(options: { stream: Readable }): Promise<AntiVirusScanResult> {
    const source = options.stream;
    const abort = (): void => {
      source.destroy();
    };

    // A declared content-length above the cap is rejected before the body is read.
    const declared = this.normalizedCls.request()?.headers['content-length']
      ?.toString()
      .trim();
    const declaredLength = declared ? Number(declared) : NaN;
    if (
      Number.isFinite(declaredLength) &&
      declaredLength > environment.CLAMAV_MAX_BYTES
    ) {
      abort();
      throw new PayloadTooLargeException(
        `Request body exceeds the ${environment.CLAMAV_MAX_BYTES} byte antivirus scan limit`,
      );
    }

    let buffer: Buffer;
    try {
      buffer = await bufferStream(source, environment.CLAMAV_MAX_BYTES);
    } catch (error) {
      abort();
      if (error instanceof PayloadTooLargeException) throw error;
      this.logger.warn('ClamAV scan failed', error);
      throw new ServiceUnavailableException('Virus scan is unavailable');
    }

    let scanResult: ScanStreamResult;
    try {
      const clam = await loadClamAv();
      // Readable.from() replays the bounded buffer for the daemon; the
      // pipeline gets its own fresh replay below.
      scanResult = await clam.scanStream(Readable.from(buffer));
    } catch (error) {
      abort();
      this.logger.warn('ClamAV scan failed', error);
      throw new ServiceUnavailableException('Virus scan is unavailable');
    }

    if (scanResult.isInfected === true) {
      abort();
      const viruses = scanResult.viruses;
      // Record the verdict before throwing so the metrics interceptor can see it.
      this.normalizedCls.fileScan().set({ isInfected: true, viruses });
      throw new UnprocessableEntityException({
        message: `File is infected with: ${viruses.join(', ')}`,
        viruses,
      });
    }

    // clamd answered with ERROR or timed out: fail closed, never "clean".
    if (scanResult.isInfected !== false) {
      abort();
      throw new ServiceUnavailableException(
        'Virus scan returned an inconclusive result',
      );
    }

    const result: AntiVirusScanResult = { isInfected: false, viruses: [] };
    // Replay the buffered body downstream; the pipeline expects a live stream.
    this.normalizedCls.sourceStream().set(Readable.from(buffer));
    this.normalizedCls.fileScan().set(result);
    return result;
  }
}
