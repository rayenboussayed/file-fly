import { Writable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

import { ModelController } from './model.controller.js';

/**
 * Creates a Writable raw sink with `setHeader` mocks for assertions.
 * @returns A writable with a mocked `setHeader`.
 */
function rawSink(): Writable & { setHeader: ReturnType<typeof vi.fn> } {
  const raw = new Writable({
    write(_chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
      callback();
    },
  });
  const setHeader = vi.fn();
  return Object.assign(raw, { setHeader }) as Writable & {
    setHeader: ReturnType<typeof vi.fn>;
  };
}

describe('ModelController', () => {
  it('delegates metadata and extract to the service', async () => {
    const modelService = {
      convert: vi.fn(),
      extract: vi.fn(async () => ({ format: 'model' })),
      metadata: vi.fn(async () => ({ format: 'model' })),
      optimize: vi.fn(async () => Buffer.from('glTF')),
    };
    const controller = new ModelController(modelService as never, {} as never);

     
    await expect(controller.metadata({} as never)).resolves.toEqual({ format: 'model' });
    expect(modelService.metadata).toHaveBeenCalledOnce();

     
    await expect(controller.extract({} as never)).resolves.toEqual({ format: 'model' });
    expect(modelService.extract).toHaveBeenCalledOnce();
  });

  it('streams the optimize output as a glb with a content disposition', async () => {
    const modelService = {
      convert: vi.fn(),
      extract: vi.fn(),
      metadata: vi.fn(),
      optimize: vi.fn(async () => Buffer.from('glb-bytes')),
    };
    const controller = new ModelController(modelService as never, {} as never);
    const response = { raw: rawSink() };

    await controller.optimize(response as never, { compress: 'meshopt', simplify: 1, weld: true });

    expect(modelService.optimize).toHaveBeenCalledWith({ compress: 'meshopt', simplify: 1, weld: true });
    expect(response.raw.setHeader).toHaveBeenCalledWith('content-type', 'model/gltf-binary');
    expect(response.raw.setHeader).toHaveBeenCalledWith('content-disposition', 'attachment; filename="export.glb"');
  });

  it('streams the convert output with the container-specific headers', async () => {
    const modelService = {
      convert: vi.fn(async () => Buffer.from('glTF')),
      extract: vi.fn(),
      metadata: vi.fn(),
      optimize: vi.fn(),
    };
    const controller = new ModelController(modelService as never, {} as never);

    const gltfResponse = { raw: rawSink() };
    await controller.convert(gltfResponse as never, { to: 'gltf' });
    expect(gltfResponse.raw.setHeader).toHaveBeenCalledWith('content-type', 'model/gltf+json');
    expect(gltfResponse.raw.setHeader).toHaveBeenCalledWith('content-disposition', 'attachment; filename="export.gltf"');

    const glbResponse = { raw: rawSink() };
    await controller.convert(glbResponse as never, { to: 'glb' });
    expect(glbResponse.raw.setHeader).toHaveBeenCalledWith('content-type', 'model/gltf-binary');
    expect(glbResponse.raw.setHeader).toHaveBeenCalledWith('content-disposition', 'attachment; filename="export.glb"');
  });
});
