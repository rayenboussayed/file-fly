import { bench, describe } from 'vitest';

import { SourceSchema } from '@/schema.js';

/**
Representative source query for the media fetch routes.
 */
const QUERY = {
  source: 'https://fixtures.local/tiny.mp4',
};

describe('source schema parse', () => {
  bench(
    'parses the source query',
    () => {
      const parsed = SourceSchema.parse(QUERY);
      // Consume the result so the compiler cannot dead-code-eliminate the call.
      if (parsed.source !== 'https://fixtures.local/tiny.mp4') {
        throw new Error('unexpected source');
      }
    },
    { throws: true },
  );
});
