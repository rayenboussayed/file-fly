import { z } from 'zod';

/** Query parameters for `source=` media fetch routes. */
export const SourceSchema = z
  .object({
    source: z.url().trim().min(1),
  })
  .strict();
