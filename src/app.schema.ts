import { z } from 'zod';

export const BaseSchema = z.object({
    source: z.url().trim().min(1),
});
export type BaseType = z.infer<typeof BaseSchema>