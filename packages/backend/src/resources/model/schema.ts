import { z } from 'zod';

/** Only the binary glTF container; .gltf JSON with external resources is not accepted. */
export const MODEL_MIME = 'model/gltf-binary';

/** House-standard query boolean (accepts true/false/1/0/yes/no/on/off, case-insensitive). */
const boolParam = z.stringbool().default(true);

/** Flat query parameters for `POST /model/optimize`. */
export const ModelOptimizeSchema = z
  .object({
    /** Compression codec for mesh data; `none` keeps uncompressed accessors. */
    compress: z.enum(['meshopt', 'draco', 'none']).default('meshopt'),
    /** Lossy simplification ratio in [0, 1]; 1 (default) disables it. Values < 1 force weld on. */
    simplify: z
      .string()
      .regex(/^(0|1|0\.\d+|1\.0+)$/, 'simplify must be a decimal in [0, 1]')
      .default('1')
      .transform(Number),
    /** Weld bitwise-identical vertices (forced on when simplify < 1); default on. */
    weld: boolParam,
  })
  .strict();
/** Query parameters for `POST /model/optimize`. */
export type ModelOptimizeType = z.infer<typeof ModelOptimizeSchema>;

/** Flat query parameters for `POST /model/convert`. */
export const ModelConvertSchema = z
  .object({
    /** `glb`: binary container. `gltf`: self-contained JSON container with data URIs. */
    to: z.enum(['glb', 'gltf']).default('glb'),
  })
  .strict();
/** Query parameters for `POST /model/convert`. */
export type ModelConvertType = z.infer<typeof ModelConvertSchema>;

/** Flat query parameters for `POST /model/metadata` (empty; rejects junk params). */
export const ModelMetadataSchema = z.object({}).strict();
/** Flat query parameters for `POST /model/extract` (empty; rejects junk params). */
export const ModelExtractSchema = z.object({}).strict();
