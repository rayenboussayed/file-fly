## Members

<dl>
<dt><a href="#ModelService">ModelService</a></dt>
<dd><p>Model feature service: glTF/GLB inspection, extraction, optimization (DRACO/Meshopt) and conversion.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#MODE_TRIANGLES">MODE_TRIANGLES</a></dt>
<dd><p>glTF primitive mode constants.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#readBody">readBody(cls)</a> ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code></dt>
<dd><p>Only the GLB container; .gltf JSON with external resources is out of scope.</p>
</dd>
<dt><a href="#assertModelSignature">assertModelSignature(buffer)</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Signature must be the GLB magic; closes the renamed-image and JSON-mislabeled holes.</p>
</dd>
<dt><a href="#boundsOf">boundsOf(document)</a> ⇒ <code>{ max: [number, number, number]; min: [number, number, number]; }</code></dt>
<dd><p>Axis-aligned bounding box over every POSITION accessor, or undefined when nothing carries positions.</p>
</dd>
<dt><a href="#metadataOf">metadataOf(document)</a> ⇒ <code>{ asset: { generator: string; version: string; }; bounds: { max: [number, number, number]; min: [number, number, number]; }; counts: { accessors: number; animations: number; cameras: number; materials: number; meshes: number; nodes: number; primitives: number; scenes: number; skins: number; textures: number; triangles: number; vertices: number; }; extensionsRequired: string[]; extensionsUsed: string[]; format: string; }</code></dt>
<dd><p>Normalized metadata payload (used by the metadata route).</p>
</dd>
<dt><a href="#extractOf">extractOf(document)</a> ⇒ <code>{ animations: { channels: number; name: string; samplers: number; }[]; format: string; materials: { alphaMode: GLTF.MaterialAlphaMode; baseColorFactor: import(&quot;@gltf-transform/core&quot;).vec4; doubleSided: boolean; emissiveFactor: import(&quot;@gltf-transform/core&quot;).vec3; metallicFactor: number; name: string; roughnessFactor: number; }[]; meshes: { name: string; primitives: { triangles: number; vertices: number; attributes: string[]; material: string; mode: GLTF.MeshPrimitiveMode; targets: number; }[]; }[]; scenes: { name: string; nodes: Record&lt;string, unknown&gt;[]; }[]; skins: { joints: number; name: string; }[]; textures: { bytes: number; mimeType: string; name: string; }[]; }</code></dt>
<dd><p>Structural extraction payload (used by the extract route).</p>
</dd>
<dt><a href="#mimeFor">mimeFor(uri)</a> ⇒ <code>string</code></dt>
<dd><p>Rewrites resource URIs to data URIs so the .gltf is a single self-contained file.</p>
</dd>
<dt><a href="#inlineResources">inlineResources(json, resources)</a></dt>
<dd><p>Rewrites resource URIs to data URIs so the .gltf is a single self-contained file.</p>
</dd>
</dl>

<a name="ModelService"></a>

## ModelService
Model feature service: glTF/GLB inspection, extraction, optimization (DRACO/Meshopt) and conversion.

**Kind**: global variable  
src: packages/backend/src/resources/model/model.service.ts:244  
dist: packages/backend/dist/resources/model/model.service.js:257 (approx.)

* [ModelService](#ModelService)
    * [.convert(query)](#ModelService+convert) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>
    * [.extract()](#ModelService+extract) ⇒ <code>Promise&lt;{ animations: { channels: number; name: string; samplers: number; }[]; format: string; materials: { alphaMode: GLTF.MaterialAlphaMode; baseColorFactor: import(&quot;@gltf-transform/core&quot;).vec4; doubleSided: boolean; emissiveFactor: import(&quot;@gltf-transform/core&quot;).vec3; metallicFactor: number; name: string; roughnessFactor: number; }[]; meshes: { name: string; primitives: { triangles: number; vertices: number; attributes: string[]; material: string; mode: GLTF.MeshPrimitiveMode; targets: number; }[]; }[]; scenes: { name: string; nodes: Record&lt;string, unknown&gt;[]; }[]; skins: { joints: number; name: string; }[]; textures: { bytes: number; mimeType: string; name: string; }[]; }&gt;</code>
    * [.metadata()](#ModelService+metadata) ⇒ <code>Promise&lt;{ asset: { generator: string; version: string; }; bounds: { max: [number, number, number]; min: [number, number, number]; }; counts: { accessors: number; animations: number; cameras: number; materials: number; meshes: number; nodes: number; primitives: number; scenes: number; skins: number; textures: number; triangles: number; vertices: number; }; extensionsRequired: string[]; extensionsUsed: string[]; format: string; }&gt;</code>
    * [.optimize(query)](#ModelService+optimize) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>

<a name="ModelService+convert"></a>

### modelService.convert(query) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>
Converts the uploaded GLB between container formats.
`glb`: binary container (lossless round-trip). `gltf`: self-contained JSON with data URIs.

**Kind**: instance method of [<code>ModelService</code>](#ModelService)  
**Returns**: <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code> - The converted bytes.  

| Param | Type | Description |
| --- | --- | --- |
| query | <code>{ to: &quot;glb&quot; \| &quot;gltf&quot;; }</code> | Target container. |

src: packages/backend/src/resources/model/model.service.ts:256  
dist: packages/backend/dist/resources/model/model.service.js:283 (approx.)
<a name="ModelService+extract"></a>

### modelService.extract() ⇒ <code>Promise&lt;{ animations: { channels: number; name: string; samplers: number; }[]; format: string; materials: { alphaMode: GLTF.MaterialAlphaMode; baseColorFactor: import(&quot;@gltf-transform/core&quot;).vec4; doubleSided: boolean; emissiveFactor: import(&quot;@gltf-transform/core&quot;).vec3; metallicFactor: number; name: string; roughnessFactor: number; }[]; meshes: { name: string; primitives: { triangles: number; vertices: number; attributes: string[]; material: string; mode: GLTF.MeshPrimitiveMode; targets: number; }[]; }[]; scenes: { name: string; nodes: Record&lt;string, unknown&gt;[]; }[]; skins: { joints: number; name: string; }[]; textures: { bytes: number; mimeType: string; name: string; }[]; }&gt;</code>
Extracts the scene graph, meshes, materials, textures, animations and skins.

**Kind**: instance method of [<code>ModelService</code>](#ModelService)  
**Returns**: <code>Promise&lt;{ animations: { channels: number; name: string; samplers: number; }[]; format: string; materials: { alphaMode: GLTF.MaterialAlphaMode; baseColorFactor: import(&quot;@gltf-transform/core&quot;).vec4; doubleSided: boolean; emissiveFactor: import(&quot;@gltf-transform/core&quot;).vec3; metallicFactor: number; name: string; roughnessFactor: number; }[]; meshes: { name: string; primitives: { triangles: number; vertices: number; attributes: string[]; material: string; mode: GLTF.MeshPrimitiveMode; targets: number; }[]; }[]; scenes: { name: string; nodes: Record&lt;string, unknown&gt;[]; }[]; skins: { joints: number; name: string; }[]; textures: { bytes: number; mimeType: string; name: string; }[]; }&gt;</code> - The structural extraction of the model.  
src: packages/backend/src/resources/model/model.service.ts:272  
dist: packages/backend/dist/resources/model/model.service.js:298 (approx.)
<a name="ModelService+metadata"></a>

### modelService.metadata() ⇒ <code>Promise&lt;{ asset: { generator: string; version: string; }; bounds: { max: [number, number, number]; min: [number, number, number]; }; counts: { accessors: number; animations: number; cameras: number; materials: number; meshes: number; nodes: number; primitives: number; scenes: number; skins: number; textures: number; triangles: number; vertices: number; }; extensionsRequired: string[]; extensionsUsed: string[]; format: string; }&gt;</code>
Normalized GLB metadata for an uploaded model.

**Kind**: instance method of [<code>ModelService</code>](#ModelService)  
**Returns**: <code>Promise&lt;{ asset: { generator: string; version: string; }; bounds: { max: [number, number, number]; min: [number, number, number]; }; counts: { accessors: number; animations: number; cameras: number; materials: number; meshes: number; nodes: number; primitives: number; scenes: number; skins: number; textures: number; triangles: number; vertices: number; }; extensionsRequired: string[]; extensionsUsed: string[]; format: string; }&gt;</code> - Format, asset descriptor, counts, extensions and bounds.  
src: packages/backend/src/resources/model/model.service.ts:283  
dist: packages/backend/dist/resources/model/model.service.js:308 (approx.)
<a name="ModelService+optimize"></a>

### modelService.optimize(query) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>
Optimizes the uploaded model in a worker thread and returns GLB bytes.

**Kind**: instance method of [<code>ModelService</code>](#ModelService)  
**Returns**: <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code> - The optimized GLB bytes.  

| Param | Type | Description |
| --- | --- | --- |
| query | <code>{ compress: &quot;none&quot; \| &quot;draco&quot; \| &quot;meshopt&quot;; weld: boolean; simplify?: number; }</code> | Compression codec, simplification ratio and weld. |

src: packages/backend/src/resources/model/model.service.ts:295  
dist: packages/backend/dist/resources/model/model.service.js:319 (approx.)
<a name="MODE_TRIANGLES"></a>

## MODE\_TRIANGLES
glTF primitive mode constants.

**Kind**: global constant  
src: packages/backend/src/resources/model/model.service.ts:62  
dist: packages/backend/dist/resources/model/model.service.js:40
<a name="readBody"></a>

## readBody(cls) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>
Only the GLB container; .gltf JSON with external resources is out of scope.

**Kind**: global function  
**Returns**: <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code> - The body bytes, capped.  

| Param | Type | Description |
| --- | --- | --- |
| cls | <code>NormalizedClsService</code> | Normalized request context. |

src: packages/backend/src/resources/model/model.service.ts:26  
dist: packages/backend/dist/resources/model/model.service.js:21
<a name="assertModelSignature"></a>

## assertModelSignature(buffer) ⇒ <code>Promise&lt;void&gt;</code>
Signature must be the GLB magic; closes the renamed-image and JSON-mislabeled holes.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>Buffer&lt;ArrayBufferLike&gt;</code> | The buffered upload. |

src: packages/backend/src/resources/model/model.service.ts:44  
dist: packages/backend/dist/resources/model/model.service.js:34
<a name="boundsOf"></a>

## boundsOf(document) ⇒ <code>{ max: [number, number, number]; min: [number, number, number]; }</code>
Axis-aligned bounding box over every POSITION accessor, or undefined when nothing carries positions.

**Kind**: global function  
**Returns**: <code>{ max: [number, number, number]; min: [number, number, number]; }</code> - The axis-aligned bounds, or undefined when no primitive carries positions.  

| Param | Type | Description |
| --- | --- | --- |
| document | <code>Document</code> | The parsed GLB document. |

src: packages/backend/src/resources/model/model.service.ts:88  
dist: packages/backend/dist/resources/model/model.service.js:57
<a name="metadataOf"></a>

## metadataOf(document) ⇒ <code>{ asset: { generator: string; version: string; }; bounds: { max: [number, number, number]; min: [number, number, number]; }; counts: { accessors: number; animations: number; cameras: number; materials: number; meshes: number; nodes: number; primitives: number; scenes: number; skins: number; textures: number; triangles: number; vertices: number; }; extensionsRequired: string[]; extensionsUsed: string[]; format: string; }</code>
Normalized metadata payload (used by the metadata route).

**Kind**: global function  
**Returns**: <code>{ asset: { generator: string; version: string; }; bounds: { max: [number, number, number]; min: [number, number, number]; }; counts: { accessors: number; animations: number; cameras: number; materials: number; meshes: number; nodes: number; primitives: number; scenes: number; skins: number; textures: number; triangles: number; vertices: number; }; extensionsRequired: string[]; extensionsUsed: string[]; format: string; }</code> - The normalized metadata payload.  

| Param | Type | Description |
| --- | --- | --- |
| document | <code>Document</code> | The parsed GLB document. |

src: packages/backend/src/resources/model/model.service.ts:122  
dist: packages/backend/dist/resources/model/model.service.js:85
<a name="extractOf"></a>

## extractOf(document) ⇒ <code>{ animations: { channels: number; name: string; samplers: number; }[]; format: string; materials: { alphaMode: GLTF.MaterialAlphaMode; baseColorFactor: import(&quot;@gltf-transform/core&quot;).vec4; doubleSided: boolean; emissiveFactor: import(&quot;@gltf-transform/core&quot;).vec3; metallicFactor: number; name: string; roughnessFactor: number; }[]; meshes: { name: string; primitives: { triangles: number; vertices: number; attributes: string[]; material: string; mode: GLTF.MeshPrimitiveMode; targets: number; }[]; }[]; scenes: { name: string; nodes: Record&lt;string, unknown&gt;[]; }[]; skins: { joints: number; name: string; }[]; textures: { bytes: number; mimeType: string; name: string; }[]; }</code>
Structural extraction payload (used by the extract route).

**Kind**: global function  
**Returns**: <code>{ animations: { channels: number; name: string; samplers: number; }[]; format: string; materials: { alphaMode: GLTF.MaterialAlphaMode; baseColorFactor: import(&quot;@gltf-transform/core&quot;).vec4; doubleSided: boolean; emissiveFactor: import(&quot;@gltf-transform/core&quot;).vec3; metallicFactor: number; name: string; roughnessFactor: number; }[]; meshes: { name: string; primitives: { triangles: number; vertices: number; attributes: string[]; material: string; mode: GLTF.MeshPrimitiveMode; targets: number; }[]; }[]; scenes: { name: string; nodes: Record&lt;string, unknown&gt;[]; }[]; skins: { joints: number; name: string; }[]; textures: { bytes: number; mimeType: string; name: string; }[]; }</code> - The structural extraction payload.  

| Param | Type | Description |
| --- | --- | --- |
| document | <code>Document</code> | The parsed GLB document. |

src: packages/backend/src/resources/model/model.service.ts:158  
dist: packages/backend/dist/resources/model/model.service.js:115
<a name="mimeFor"></a>

## mimeFor(uri) ⇒ <code>string</code>
Rewrites resource URIs to data URIs so the .gltf is a single self-contained file.

**Kind**: global function  
**Returns**: <code>string</code> - The best-known MIME type for the resource.  

| Param | Type | Description |
| --- | --- | --- |
| uri | <code>string</code> | The resource URI. |

src: packages/backend/src/resources/model/model.service.ts:330  
dist: packages/backend/dist/resources/model/model.service.js:354 (approx.)
<a name="inlineResources"></a>

## inlineResources(json, resources)
Rewrites resource URIs to data URIs so the .gltf is a single self-contained file.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| json | <code>GLTF.IGLTF</code> | The glTF JSON document to rewrite in place. |
| resources | <code>{ [s: string]: Uint8Array&lt;ArrayBuffer&gt;; }</code> | The resource map from writeJSON. |

src: packages/backend/src/resources/model/model.service.ts:346  
dist: packages/backend/dist/resources/model/model.service.js:376 (approx.)
