import { z } from 'zod';

import { trimmed } from '@/utils/zod.js';

const trimmedText = trimmed(z.string().min(1));
const trimmedTextMax32 = trimmed(z.string().min(1).max(32));
const singleCharacterOrFalse = z.union([z.string().length(1), z.literal(false)]);
const csvColumn = z.union([
  z.string().min(1),
  z.object({ header: z.string().optional(), key: z.string().min(1) }).strict(),
]);
const csvRecord = z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())]);
const nullableTrimmedText = trimmedText.nullable();

/**
 * JSON body for `POST /csv/build`: rows in, CSV bytes out.
 * Elements may be row objects or arrays of cell values.
 */
export const CsvBuildSchema = z
  .object({
    /**
    csv-stringify options (names kept as in the library). `escape_formulas` defaults to true.
     */
    options: z
      .object({
        bom: z.boolean().optional(),
        columns: z.array(csvColumn).optional(),
        delimiter: trimmedTextMax32.optional(),
        eof: z.boolean().optional(),
        escape: z.string().length(1).optional(),
        escape_formulas: z.boolean().optional(),
        header: z.boolean().optional(),
        header_as_comment: z.boolean().optional(),
        quote: singleCharacterOrFalse.optional(),
        quote_record_delimiter: z.boolean().optional(),
        quoted: z.boolean().optional(),
        quoted_empty: z.boolean().optional(),
        quoted_string: z.boolean().optional(),
        record_delimiter: trimmedTextMax32.optional(),
      })
      .strict()
      .optional(),
    /**
    Rows to serialize; objects map keys to cells, arrays emit positional cells.
     */
    records: z.array(csvRecord),
  })
  .strict();
/**
Validated body for `POST /csv/build`.
 */
export type CsvBuildType = z.infer<typeof CsvBuildSchema>;

/**
csv-parse options shared by `/csv/extract` and `/csv/metadata` (function-valued options excluded).
 */
const csvParseOptions = z.object({
  bom: z.stringbool().optional(),
  cast: z.stringbool().optional(),
  cast_date: z.stringbool().optional(),
  columns: z
    .union([
      z.stringbool(),
      z.string().min(1).transform((value) => value.split(',').map((part) => part.trim()).filter((part) => part.length > 0)),
      z.array(nullableTrimmedText).max(1000),
    ])
    .optional(),
  comment: z.string().length(1).optional(),
  comment_no_infix: z.stringbool().optional(),
  delimiter: trimmed(z.string().min(1).max(32)).optional(),
  delimiter_auto: z.stringbool().optional(),
  encoding: z
    .enum(['ascii', 'utf8', 'utf16le', 'ucs2', 'latin1', 'binary', 'base64', 'hex'])
    .optional(),
  escape: z.string().length(1).optional(),
  from: z.coerce.number().int().min(1).optional(),
  from_line: z.coerce.number().int().min(1).optional(),
  group_columns_by_name: z.stringbool().optional(),
  ignore_last_delimiters: z.stringbool().optional(),
  ltrim: z.stringbool().optional(),
  max_record_size: z.coerce.number().int().positive().optional(),
  objname: trimmed(z.string().min(1)).optional(),
  quote: z.union([z.string().length(1), z.literal(false)]).optional(),
  record_delimiter: trimmed(z.string().min(1).max(32)).optional(),
  relax_column_count: z.stringbool().optional(),
  relax_column_count_less: z.stringbool().optional(),
  relax_column_count_more: z.stringbool().optional(),
  relax_quotes: z.stringbool().optional(),
  rtrim: z.stringbool().optional(),
  skip_empty_lines: z.stringbool().optional(),
  skip_records_with_empty_values: z.stringbool().optional(),
  skip_records_with_error: z.stringbool().optional(),
  to: z.coerce.number().int().min(1).optional(),
  to_line: z.coerce.number().int().min(1).optional(),
  trim: z.stringbool().optional(),
}).strict();

/**
 * Flat query parameters for `POST /csv/extract`.
 * The raw CSV travels in the request body; everything here is csv-parse options.
 */
export const CsvExtractSchema = csvParseOptions;
/**
Flat query parameters for `POST /csv/extract`.
 */
export type CsvExtractType = z.infer<typeof CsvExtractSchema>;

const metadataParseOptions = csvParseOptions.pick({
  bom: true,
  cast_date: true,
  comment: true,
  comment_no_infix: true,
  delimiter: true,
  delimiter_auto: true,
  encoding: true,
  escape: true,
  max_record_size: true,
  quote: true,
  record_delimiter: true,
  relax_column_count: true,
  relax_column_count_less: true,
  relax_column_count_more: true,
  relax_quotes: true,
  skip_empty_lines: true,
  trim: true,
});

/**
 * Flat query parameters for `POST /csv/metadata`.
 * `maxRows` caps the per-cell type census; row and column counting always scans the whole file.
 */
export const CsvMetadataSchema = metadataParseOptions.extend({
  maxRows: z.coerce.number().int().min(1).max(100_000).default(10_000),
});
/**
Flat query parameters for `POST /csv/metadata`.
 */
export type CsvMetadataType = z.infer<typeof CsvMetadataSchema>;
