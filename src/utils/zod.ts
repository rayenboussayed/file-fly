import { z } from 'zod';

/**
 * Trim the input string, then validate it with the given schema.
 * @param schema Description.
 * @returns Result.
 */
export function trimmed<T extends z.ZodTypeAny>(schema: T) {
  const piped = z.string().trim().pipe(schema as z.ZodType<T, string>);
  return piped as z.ZodPipe<z.ZodString, T>;
}