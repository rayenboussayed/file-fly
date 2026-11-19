/**
 * Minimal types for the CommonJS draco3dgltf package (typed by hand).
 * The wasm modules it exports are opaque to TypeScript; gltf-transform treats
 * them as `unknown` in registerDependencies.
 */
declare module 'draco3dgltf' {
  const draco3d: {
    createDecoderModule(): Promise<unknown>;
    createEncoderModule(): Promise<unknown>;
  };
  export default draco3d;
}
