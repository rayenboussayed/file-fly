import type { NestInterceptor } from '@nestjs/common';

import { INTERCEPTORS_METADATA } from '@nestjs/common/constants';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { FileParserInterceptor } from './file-parser.interceptor.js';
import { FileScannerInterceptor } from './file-scanner.interceptor.js';
import { UseMediaPipeline, UseScanPipeline } from './pipeline.decorator.js';

class SignatureInterceptor implements NestInterceptor<unknown, unknown> {
  intercept() {
    return of(undefined);
  }
}

/**
 * Reads the interceptor metadata Nest stores on a decorated class.
 * @param target - The decorated class.
 * @returns The interceptors in registration order.
 */
const reflect = Reflect;
const interceptorsOf = (target: object): undefined | unknown[] =>
  // reflect-metadata augments Reflect; alias avoids unicorn/no-nonstandard-builtin-properties.
  reflect.getMetadata(INTERCEPTORS_METADATA, target) as undefined | unknown[];

describe('pipeline decorators', () => {
  it('applies scan only for document routes', () => {
    class DocumentController {}
    UseScanPipeline()(DocumentController);
    expect(interceptorsOf(DocumentController)).toEqual([FileScannerInterceptor]);
  });

  it('applies scan and parse for generic media routes', () => {
    class MediaController {}
    UseMediaPipeline()(MediaController);
    expect(interceptorsOf(MediaController)).toEqual([
      FileScannerInterceptor,
      FileParserInterceptor,
    ]);
  });

  it('appends the signature gate after scan and parse', () => {
    class SignedController {}
    UseMediaPipeline(SignatureInterceptor)(SignedController);
    expect(interceptorsOf(SignedController)).toEqual([
      FileScannerInterceptor,
      FileParserInterceptor,
      SignatureInterceptor,
    ]);
  });

  it('attaches the same metadata when applied to a method', () => {
    class MethodController {
      route() {
        return;
      }
    }
    const descriptor = Object.getOwnPropertyDescriptor(MethodController.prototype, 'route');
    UseScanPipeline()(MethodController.prototype, 'route', descriptor as PropertyDescriptor);
    expect(reflect.getMetadata(INTERCEPTORS_METADATA, descriptor?.value as object)).toEqual([
      FileScannerInterceptor,
    ]);
  });
});
