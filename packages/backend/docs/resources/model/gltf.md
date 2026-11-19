## Members

<dl>
<dt><a href="#ioPromise">ioPromise</a></dt>
<dd><p>Lazily-built NodeIO with meshopt and draco registered; wasm modules are created once per process.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#readModel">readModel</a> ⇒ <code>Promise&lt;Document&gt;</code></dt>
<dd><p>Opens a GLB work package; a single corrupt byte answers 400.</p>
</dd>
<dt><a href="#writeGlb">writeGlb</a> ⇒ <code>Promise&lt;Uint8Array&lt;ArrayBufferLike&gt;&gt;</code></dt>
<dd><p>Serializes a document to GLB bytes.</p>
</dd>
<dt><a href="#writeGltfJson">writeGltfJson</a> ⇒ <code>Promise&lt;GltfJsonOutput&gt;</code></dt>
<dd><p>Converts a document to the glTF JSON document plus its resources.</p>
</dd>
<dt><a href="#optimizeDocument">optimizeDocument</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Runs the optimize pipeline in the caller (used by the worker, where transforms are safe).</p>
</dd>
</dl>

<a name="ioPromise"></a>

## ioPromise
Lazily-built NodeIO with meshopt and draco registered; wasm modules are created once per process.

**Kind**: global variable  
src: packages/backend/src/resources/model/gltf.ts:18  
dist: packages/backend/dist/resources/model/gltf.js:7
<a name="readModel"></a>

## readModel ⇒ <code>Promise&lt;Document&gt;</code>
Opens a GLB work package; a single corrupt byte answers 400.

**Kind**: global constant  
**Returns**: <code>Promise&lt;Document&gt;</code> - The parsed gltf-transform document.  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>Buffer&lt;ArrayBufferLike&gt;</code> | The uploaded GLB bytes. |

src: packages/backend/src/resources/model/gltf.ts:47  
dist: packages/backend/dist/resources/model/gltf.js:27
<a name="writeGlb"></a>

## writeGlb ⇒ <code>Promise&lt;Uint8Array&lt;ArrayBufferLike&gt;&gt;</code>
Serializes a document to GLB bytes.

**Kind**: global constant  
**Returns**: <code>Promise&lt;Uint8Array&lt;ArrayBufferLike&gt;&gt;</code> - The GLB bytes.  

| Param | Type | Description |
| --- | --- | --- |
| document | <code>Document</code> | The document to serialize. |

src: packages/backend/src/resources/model/gltf.ts:62  
dist: packages/backend/dist/resources/model/gltf.js:36
<a name="writeGltfJson"></a>

## writeGltfJson ⇒ <code>Promise&lt;GltfJsonOutput&gt;</code>
Converts a document to the glTF JSON document plus its resources.

**Kind**: global constant  
**Returns**: <code>Promise&lt;GltfJsonOutput&gt;</code> - The JSON document and the resource map.  

| Param | Type | Description |
| --- | --- | --- |
| document | <code>Document</code> | The document to convert. |

src: packages/backend/src/resources/model/gltf.ts:72  
dist: packages/backend/dist/resources/model/gltf.js:40
<a name="optimizeDocument"></a>

## optimizeDocument ⇒ <code>Promise&lt;void&gt;</code>
Runs the optimize pipeline in the caller (used by the worker, where transforms are safe).

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| document | <code>Document</code> | The document to optimize (already opened via [readModel](#readModel)). |
| options | <code>{ compress: &quot;draco&quot; \| &quot;meshopt&quot; \| &quot;none&quot;; simplify: number; weld: boolean; }</code> | Compression codec, simplification ratio and weld. |
| options.compress |  | The compression codec ('meshopt', 'draco' or 'none'). |
| options.simplify |  | The simplification ratio in [0, 1]; 1 disables it. |
| options.weld |  | Whether to weld bitwise-identical vertices. |

src: packages/backend/src/resources/model/gltf.ts:86  
dist: packages/backend/dist/resources/model/gltf.js:45
