import { ForbiddenException, Injectable } from '@nestjs/common';
import { fileTypeFromStream } from 'file-type';
import { Readable } from 'node:stream';

import { NormalizedClsService } from './normalized-cls.service.js';

@Injectable()
export class FileTypeService {
  constructor(private readonly normalizedCls: NormalizedClsService) {}

  isAudio(mime: string) {
    return mime.startsWith('audio/');
  }

  isImage(mime: string) {
    return mime.startsWith('image/');
  }

  isVideo(mime: string) {
    return mime.startsWith('video/');
  }

  async signature(options: { stream: Readable }) {
    let detected = false;
    // `Readable.toWeb` propagates the web cancel done by `fileTypeFromStream`
    // as a destroy of the Node stream, tearing the probe branch out of the
    // request's tee and stalling the upload. Use a non-destructive wrapper.
    const web = nonDestructiveWebStream(options.stream);
    try {
      const signature = await fileTypeFromStream(web, {
        mpegOffsetTolerance: 10,
      });

      if (!signature)
        throw new ForbiddenException('File signature could not be determined');

      this.normalizedCls.fileSignature().set(signature);
      detected = true;
    } finally {
      if (!detected) {
        // Rejected before the request is routed: stop consuming the upload.
        options.stream.destroy();
      }
      // On success the web pump's cancel already discards the probe branch's
      // remainder in the same iterator (see nonDestructiveWebStream).
    }
  }
}

/**
 * Wraps a Node readable in a web stream whose `cancel` only detaches the
 * pump, without destroying the Node stream.
 *
 * `fileTypeFromStream` cancels its web stream as soon as the signature is
 * known; with `Readable.toWeb` that cancel destroys the Node stream (with an
 * AbortError), which would kill the probe branch of the shared tee. Here the
 * pump stops requesting chunks and instead keeps pulling from the same
 * iterator, discarding everything, so the probe branch of the tee keeps
 * flowing and the upload is not stalled by the probe being finished.
 * @param node - The Node readable to wrap (e.g. a probe branch of a tee).
 * @returns A web ReadableStream serving the same bytes.
 */
// eslint-disable-next-line n/no-unsupported-features/node-builtins
function nonDestructiveWebStream(node: Readable): ReadableStream<Uint8Array> {
  const iterator = node[Symbol.asyncIterator]();
  let cancelled = false;

  /**
   * Normalizes a chunk to bytes for the web stream.
   * @param value - The chunk received from the Node stream iterator.
   * @returns The chunk as bytes.
   */
  const toBytes = (value: unknown): Uint8Array => {
    if (Buffer.isBuffer(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    if (typeof value === 'string') return Buffer.from(value);
    return value as Uint8Array;
  };

  /**
   * Reads the remainder of the Node stream with the same iterator, discarding
   * every chunk, so a paused tee unblocks.
   * @returns The number of bytes discarded.
   */
  const drainIterator = async (): Promise<number> => {
    let dropped = 0;
    try {
      for await (const chunk of iterator) {
        if (Buffer.isBuffer(chunk)) {
          dropped += chunk.length;
        } else if (typeof chunk === 'string') {
          dropped += Buffer.byteLength(chunk);
        } else {
          dropped += (chunk as Uint8Array).byteLength;
        }
      }
    } catch {
      // The upload then fails on its own terms; nothing to report.
      return dropped;
    }
    return dropped;
  };

  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  return new ReadableStream<Uint8Array>({
    cancel() {
      // Keep pulling from the Node stream with the same iterator and drop
      // everything, so the probe branch of the tee is not left backed up.
      cancelled = true;
      void drainIterator().catch(() => undefined);
    },
    async pull(controller) {
      if (cancelled) return;
      try {
        const { done, value } = await iterator.next();
        if (cancelled) return;
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(toBytes(value));
      } catch (error) {
        if (!cancelled) {
          try {
            controller.error(error);
          } catch {
            // The web stream was cancelled concurrently; forget the pump.
            cancelled = true;
          }
        }
      }
    },
  });
}
