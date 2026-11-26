/**
Outcome of the worker cache lookup for this request (`hit` | `miss`).
 */
export const CLS_CACHE_OUTCOME = Symbol.for('CLS_CACHE_OUTCOME');

/**
Count of bytes received for this request (signature/file-hash path or download meter).
 */
export const CLS_BYTES_IN = Symbol.for('CLS_BYTES_IN');

/**
Count of bytes streamed to the client for this request (via the out meter).
 */
export const CLS_BYTES_OUT = Symbol.for('CLS_BYTES_OUT');

/**
Deterministic cache key for this request (file hash + query, or body digest).
 */
export const CLS_CACHE_KEY = Symbol.for('CLS_CACHE_KEY');

/**
SHA-512 of the uploaded bytes (or its first FILE_HASH_HEADER_SIZE bytes).
 */
export const CLS_FILE_HASH = Symbol.for('CLS_FILE_HASH');

/**
Result of the virus scan for this request, when scanning is enabled.
 */
export const CLS_FILE_SCAN = Symbol.for('CLS_FILE_SCAN');

/**
Detected file-type signature of the upload, when probed.
 */
export const CLS_FILE_SIGNATURE = Symbol.for('CLS_FILE_SIGNATURE');

/**
Direction of the media source: `upload` (POST body) or `download` (`source=` URL).
 */
export const CLS_SOURCE_DIRECTION = Symbol.for('CLS_SOURCE_DIRECTION');

/**
The (possibly capped) media stream for this request, set by the scanner/parser.
 */
export const CLS_SOURCE_STREAM = Symbol.for('CLS_SOURCE_STREAM');
