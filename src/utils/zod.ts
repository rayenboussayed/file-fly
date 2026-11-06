import { z } from 'zod';

/** Trim the input string, then validate it with the given schema. */
export function trimmed<T extends z.ZodTypeAny>(schema: T) {
  const piped = z.string().trim().pipe(schema as never);
  return piped as unknown as z.ZodPipe<z.ZodString, T>;
}