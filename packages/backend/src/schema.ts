import { z } from "zod";

export const SourceSchema = z.object({
    source: z.url().trim().min(1),
});
