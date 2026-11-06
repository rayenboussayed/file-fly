import type { Readable } from 'node:stream';

import { createHash } from 'node:crypto';

class Hash {
  constructor(private readonly algorithm: string) {}

  buffer(value: Buffer | string) {
    const sha =  createHash(this.algorithm);
    return sha.update(value).digest();
  }

  stream(stream: Readable) {
    const sha = createHash(this.algorithm);
    return new Promise<Buffer>((resolve, reject) => {
      stream.once('error', reject);
      stream.on('data', (chunk) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        sha.update(buffer);
      });
      stream.once('end', () => {
        resolve(sha.digest());
      });
    });
  }
}

export const sha512 = new Hash('sha512');
