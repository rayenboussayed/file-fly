import { type NestInterceptor, type Type, UseInterceptors } from '@nestjs/common';

import { FileParserInterceptor } from './file-parser.interceptor.js';
import { FileScannerInterceptor } from './file-scanner.interceptor.js';

/**
 * Applies the scan and parse gates used by media routes, with an optional
 * signature gate that enforces the accepted input formats.
 * @param signature - Resource-specific signature interceptor, when one exists.
 * @returns The composed interceptor decorator.
 */
export function UseMediaPipeline(signature?: Type<NestInterceptor<unknown, unknown>>) {
  const interceptors: Array<Type<NestInterceptor<unknown, unknown>>> = [
    FileScannerInterceptor,
    FileParserInterceptor,
  ];
  if (signature) interceptors.push(signature);
  return UseInterceptors(...interceptors);
}

/**
 * Applies the scan gate used by document routes, which carry a JSON body and
 * need no signature probe.
 * @returns The composed interceptor decorator.
 */
export function UseScanPipeline() {
  return UseInterceptors(FileScannerInterceptor);
}
