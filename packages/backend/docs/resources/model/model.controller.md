<a name="ModelController"></a>

## ModelController
GLB routes. All routes take the binary upload and bypass the JSON parser by
design; they are ClamAV-scanned and GLB-signature gated (`glTF` magic).

**Kind**: global variable  
src: packages/backend/src/resources/model/model.controller.ts:34  
dist: packages/backend/dist/resources/model/model.controller.js:21

* [ModelController](#ModelController)
    * [.convert(response, query)](#ModelController+convert) ⇒ <code>Promise&lt;void&gt;</code>
    * [.extract(_query)](#ModelController+extract) ⇒ <code>Promise&lt;{ animations: { channels: number; name: string; samplers: number; }[]; format: string; materials: { alphaMode: import(&quot;@gltf-transform/core&quot;).GLTF.MaterialAlphaMode; baseColorFactor: import(&quot;@gltf-transform/core&quot;).vec4; doubleSided: boolean; emissiveFactor: import(&quot;@gltf-transform/core&quot;).vec3; metallicFactor: number; name: string; roughnessFactor: number; }[]; meshes: { name: string; primitives: { triangles: number; vertices: number; attributes: string[]; material: string; mode: import(&quot;@gltf-transform/core&quot;).GLTF.MeshPrimitiveMode; targets: number; }[]; }[]; scenes: { name: string; nodes: Record&lt;string, unknown&gt;[]; }[]; skins: { joints: number; name: string; }[]; textures: { bytes: number; mimeType: string; name: string; }[]; }&gt;</code>
    * [.metadata(_query)](#ModelController+metadata) ⇒ <code>Promise&lt;{ asset: { generator: string; version: string; }; bounds: { max: [number, number, number]; min: [number, number, number]; }; counts: { accessors: number; animations: number; cameras: number; materials: number; meshes: number; nodes: number; primitives: number; scenes: number; skins: number; textures: number; triangles: number; vertices: number; }; extensionsRequired: string[]; extensionsUsed: string[]; format: string; }&gt;</code>
    * [.optimize(response, query)](#ModelController+optimize) ⇒ <code>Promise&lt;void&gt;</code>

<a name="ModelController+convert"></a>

### modelController.convert(response, query) ⇒ <code>Promise&lt;void&gt;</code>
Converts the uploaded GLB between container formats (201).

**Kind**: instance method of [<code>ModelController</code>](#ModelController)  
**Returns**: <code>Promise&lt;void&gt;</code> - The converted bytes (201).  

| Param | Type | Description |
| --- | --- | --- |
| response | <code>FastifyReply&lt;import(&quot;fastify&quot;).RouteGenericInterface, import(&quot;fastify&quot;).RawServerDefault, import(&quot;http&quot;).IncomingMessage, import(&quot;http&quot;).ServerResponse&lt;import(&quot;http&quot;).IncomingMessage&gt;, unknown, import(&quot;fastify&quot;).FastifySchema, import(&quot;fastify&quot;).FastifyTypeProviderDefault, unknown&gt;</code> | Raw reply, streamed as model/gltf-binary or model/gltf+json. |
| query | <code>{ to: &quot;glb&quot; \| &quot;gltf&quot;; }</code> | Target container (`glb` or self-contained `gltf`). |

src: packages/backend/src/resources/model/model.controller.ts:48  
dist: packages/backend/dist/resources/model/model.controller.js:28
<a name="ModelController+extract"></a>

### modelController.extract(_query) ⇒ <code>Promise&lt;{ animations: { channels: number; name: string; samplers: number; }[]; format: string; materials: { alphaMode: import(&quot;@gltf-transform/core&quot;).GLTF.MaterialAlphaMode; baseColorFactor: import(&quot;@gltf-transform/core&quot;).vec4; doubleSided: boolean; emissiveFactor: import(&quot;@gltf-transform/core&quot;).vec3; metallicFactor: number; name: string; roughnessFactor: number; }[]; meshes: { name: string; primitives: { triangles: number; vertices: number; attributes: string[]; material: string; mode: import(&quot;@gltf-transform/core&quot;).GLTF.MeshPrimitiveMode; targets: number; }[]; }[]; scenes: { name: string; nodes: Record&lt;string, unknown&gt;[]; }[]; skins: { joints: number; name: string; }[]; textures: { bytes: number; mimeType: string; name: string; }[]; }&gt;</code>
Extracts the scene graph, meshes, materials, textures, animations and skins (201).

**Kind**: instance method of [<code>ModelController</code>](#ModelController)  
**Returns**: <code>Promise&lt;{ animations: { channels: number; name: string; samplers: number; }[]; format: string; materials: { alphaMode: import(&quot;@gltf-transform/core&quot;).GLTF.MaterialAlphaMode; baseColorFactor: import(&quot;@gltf-transform/core&quot;).vec4; doubleSided: boolean; emissiveFactor: import(&quot;@gltf-transform/core&quot;).vec3; metallicFactor: number; name: string; roughnessFactor: number; }[]; meshes: { name: string; primitives: { triangles: number; vertices: number; attributes: string[]; material: string; mode: import(&quot;@gltf-transform/core&quot;).GLTF.MeshPrimitiveMode; targets: number; }[]; }[]; scenes: { name: string; nodes: Record&lt;string, unknown&gt;[]; }[]; skins: { joints: number; name: string; }[]; textures: { bytes: number; mimeType: string; name: string; }[]; }&gt;</code> - The extraction document.  

| Param | Type | Description |
| --- | --- | --- |
| _query | <code>unknown</code> | Empty query object; junk parameters are rejected with 400. |

src: packages/backend/src/resources/model/model.controller.ts:72  
dist: packages/backend/dist/resources/model/model.controller.js:40
<a name="ModelController+metadata"></a>

### modelController.metadata(_query) ⇒ <code>Promise&lt;{ asset: { generator: string; version: string; }; bounds: { max: [number, number, number]; min: [number, number, number]; }; counts: { accessors: number; animations: number; cameras: number; materials: number; meshes: number; nodes: number; primitives: number; scenes: number; skins: number; textures: number; triangles: number; vertices: number; }; extensionsRequired: string[]; extensionsUsed: string[]; format: string; }&gt;</code>
Normalized GLB metadata (201).

**Kind**: instance method of [<code>ModelController</code>](#ModelController)  
**Returns**: <code>Promise&lt;{ asset: { generator: string; version: string; }; bounds: { max: [number, number, number]; min: [number, number, number]; }; counts: { accessors: number; animations: number; cameras: number; materials: number; meshes: number; nodes: number; primitives: number; scenes: number; skins: number; textures: number; triangles: number; vertices: number; }; extensionsRequired: string[]; extensionsUsed: string[]; format: string; }&gt;</code> - The metadata document.  

| Param | Type | Description |
| --- | --- | --- |
| _query | <code>unknown</code> | Empty query object; junk parameters are rejected with 400. |

src: packages/backend/src/resources/model/model.controller.ts:85  
dist: packages/backend/dist/resources/model/model.controller.js:43
<a name="ModelController+optimize"></a>

### modelController.optimize(response, query) ⇒ <code>Promise&lt;void&gt;</code>
Optimizes the uploaded model (dedup, prune, weld, optional simplify, optional meshopt/draco) (201).

**Kind**: instance method of [<code>ModelController</code>](#ModelController)  
**Returns**: <code>Promise&lt;void&gt;</code> - The optimized GLB bytes (201).  

| Param | Type | Description |
| --- | --- | --- |
| response | <code>FastifyReply&lt;import(&quot;fastify&quot;).RouteGenericInterface, import(&quot;fastify&quot;).RawServerDefault, import(&quot;http&quot;).IncomingMessage, import(&quot;http&quot;).ServerResponse&lt;import(&quot;http&quot;).IncomingMessage&gt;, unknown, import(&quot;fastify&quot;).FastifySchema, import(&quot;fastify&quot;).FastifyTypeProviderDefault, unknown&gt;</code> | Raw reply, streamed as model/gltf-binary. |
| query | <code>{ compress: &quot;none&quot; \| &quot;draco&quot; \| &quot;meshopt&quot;; weld: boolean; simplify?: number; }</code> | Compression codec and simplification options. |

src: packages/backend/src/resources/model/model.controller.ts:97  
dist: packages/backend/dist/resources/model/model.controller.js:46
