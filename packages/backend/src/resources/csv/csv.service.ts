import type { Readable } from 'node:stream';

import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { parse, type Options as ParseOptions } from 'csv-parse';
import { stringify } from 'csv-stringify';
import { buffer2stream } from 'jutilities/node/stream/buffer';

import { environment } from '@/environment.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { bufferStream } from '@/utils/buffer.js';
import { openMediaSource } from '@/utils/open-source.js';

import type { CsvBuildType, CsvExtractType, CsvMetadataType } from './schema.js';

/** Hard cap on parsed records; beyond it the response would exhaust memory. */
const MAX_RECORDS = 1_000_000;

/** Error thrown when a record cap is exceeded; maps to 413 at the boundary. */
class RecordCapError extends Error {}

/**
 * Maps a csv-parse/csv-stringify failure to a 400 with the library's error code.
 * @param error - The library error (carries `code` and `message`).
 * @returns A 400 exception carrying the library's code and message.
 */
export const toBadRequest = (error: unknown): BadRequestException => {
  if (error instanceof RecordCapError) {
    return new PayloadTooLargeException(error.message);
  }
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as Record<'code', unknown>)['code'])
      : 'CSV_ERROR';
  const message = error instanceof Error ? error.message : String(error);
  return new BadRequestException({ code, message });
};

/**
 * Opens (idempotently) and reads the uploaded CSV body, bounded by the scanner cap.
 * The scanner opens the source only when ClamAV is enabled, so the service must too.
 * Only `text/csv` and `application/octet-stream` bodies are accepted.
 * @param cls - The normalized request context (source stream accessors).
 * @returns The body bytes, capped.
 * @throws {UnsupportedMediaTypeException} For any other content type.
 */
const readBody = async (cls: NormalizedClsService): Promise<Buffer> => {
  const contentType = String(cls.request()?.headers?.['content-type'] ?? '');
  const mime = contentType.split(';', 1)[0]?.trim() ?? ''; // split always yields a first element; the ?? '' is for the type system
  if (mime !== 'text/csv' && mime !== 'application/octet-stream') {
    throw new UnsupportedMediaTypeException(`Unsupported media type "${mime}" for CSV input`);
  }
  await openMediaSource(cls);
  const stream = cls.sourceStream().get();
  if (!stream) {
    // Method-less invocations carry no body; maps to a client error, not a 500.
    throw new BadRequestException({ code: 'CSV_NO_SOURCE', message: 'CSV body is missing' });
  }
  return bufferStream(stream, environment.CLAMAV_MAX_BYTES);
};

/** CSV serialization, parsing and structural statistics. */
@Injectable()
export class CsvService {
  constructor(private readonly cls: NormalizedClsService) {}

  /**
   * Builds the CSV response stream for `POST /csv/build`.
   * `escape_formulas` defaults to true: cells starting with `= + - @ TAB CR` are prefixed with `'`.
   * @param body - Validated build payload (rows plus csv-stringify options).
   * @returns The readable CSV byte stream (201 by POST convention).
   */
  buildCsv(body: CsvBuildType): Readable {
    // Options are zod-validated at the boundary; stringify() cannot throw on them here.
    return stringify(body.records, { escape_formulas: true, ...body.options });
  }

  /**
   * Parses the uploaded CSV into typed JSON records.
   * Function-valued csv-parse options are not exposed over HTTP. At most
   * {@link MAX_RECORDS} records are materialized; larger files answer 413.
   * The first record is treated as data (no header semantics here).
   * @param query - Validated, flat csv-parse options (file travels in the body).
   * @returns The parsed records.
   */
  async extract(query: CsvExtractType) {
    const buffer = await readBody(this.cls);
    const options: ParseOptions = { bom: true, ...query };
    const records: unknown[] = [];
    try {
      const parser = buffer2stream({ buffer }).pipe(parse(options));
      for await (const record of parser) {
        records.push(record);
        if (records.length > MAX_RECORDS) {
          throw new RecordCapError(`record cap of ${MAX_RECORDS} exceeded`);
        }
      }
    } catch (error) {
      throw toBadRequest(error);
    }
    return { records };
  }

  /**
   * Computes structural metadata for an uploaded CSV. One streaming pass.
   * `maxRows` limits the per-column type census; row/column counting always scans everything.
   * The first record counts as a data row (header or not). `delimiter_auto`
   * defaults on unless `delimiter` is given; the reported delimiter is the
   * supplied value, or `auto` when none was (csv-parse does not hand the
   * winning value back).
   * @param query - Validated, flat csv-parse options plus `maxRows`.
   * @returns Rows, columns, delimiter handed over (`auto` unless given), and per-column type counts.
   */
  async metadata(query: CsvMetadataType) {
    const buffer = await readBody(this.cls);
    const { maxRows, ...parseOptions } = query;
    const options: ParseOptions = {
      bom: true,
      ...(parseOptions.delimiter === undefined ? { delimiter_auto: true } : {}),
      ...parseOptions,
    };
    type TypeKey = 'boolean' | 'date' | 'empty' | 'number' | 'string';
    const census = new Map<number, Record<TypeKey, number>>();
    let columns = 0;
    let rows = 0;
    try {
      const parser = buffer2stream({ buffer }).pipe(
        parse({ ...options, cast: true, cast_date: true }),
      );
      for await (const record of parser) {
        rows += 1;
        if (rows > MAX_RECORDS) {
          throw new RecordCapError(`record cap of ${MAX_RECORDS} exceeded`);
        }
        const values = Array.isArray(record) ? record : Object.values(record as Record<string, unknown>);
        columns = Math.max(columns, values.length);
        if (rows > maxRows) continue;
        values.forEach((value, index) => {
          const entry = census.get(index) ?? { boolean: 0, date: 0, empty: 0, number: 0, string: 0 };
          entry[kindOf(value)] += 1;
          census.set(index, entry);
        });
      }
    } catch (error) {
      throw toBadRequest(error);
    }
    return {
      bom: buffer.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])),
      columns,
      delimiter: options.delimiter ?? 'auto',
      maxRows,
      perColumn: [...census.entries()]
        .sort(([a], [b]) => a - b)
        .map(([index, types]) => ({ index, types })),
      recordDelimiter: options.record_delimiter ?? 'auto',
      rows,
      truncatedTypes: rows > maxRows,
    };
  }
}

/**
 * Classifies a cast csv-parse value. `empty` covers null/undefined and empty strings;
 * exact `true`/`false` strings count as boolean (csv-parse does not cast them).
 * @param value - One cast field value.
 * @returns The census key for the value.
 */
const kindOf = (value: unknown): 'boolean' | 'date' | 'empty' | 'number' | 'string' => {
  if (value === null || value === undefined || value === '') return 'empty';
  if (value === 'true' || value === 'false') return 'boolean';
  if (typeof value === 'number' || typeof value === 'bigint') return 'number';
  if (value instanceof Date) return 'date';
  return 'string';
};
