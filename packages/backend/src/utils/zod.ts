import { z } from 'zod';

/**
 * A query schema that accepts only an empty object and rejects any unknown key.
 *
 * Shared by every document/model endpoint whose query string must be empty
 * (extract/metadata style routes). Reusing one instance keeps the strict-empty
 * behaviour identical across all of them.
 */
export const EmptyQuerySchema = z.object({}).strict();

/**
 * Trim the input string, then validate it with the given schema.
 * @param schema - The schema to apply after trimming.
 * @returns Zod pipe: string().trim() piped into `schema`.
 */
export function trimmed<T extends z.ZodTypeAny>(schema: T) {
  // zod's pipe() wants the schema's input type to be string; T's input is unknown-ish.
  const piped = z.string().trim().pipe(schema as z.ZodType<T, string>);
  // Outer cast is required because z.string().trim() widens the pipe's left side.
  return piped as z.ZodPipe<z.ZodString, T>;
}