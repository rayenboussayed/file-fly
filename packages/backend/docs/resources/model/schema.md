## Members

<dl>
<dt><a href="#compress">compress</a></dt>
<dd><p>Compression codec for mesh data; <code>none</code> keeps uncompressed accessors.</p>
</dd>
<dt><a href="#simplify">simplify</a></dt>
<dd><p>Lossy simplification ratio in [0, 1]; 1 (default) disables it. Values &lt; 1 force weld on.</p>
</dd>
<dt><a href="#weld">weld</a></dt>
<dd><p>Weld bitwise-identical vertices (forced on when simplify &lt; 1); default on.</p>
</dd>
<dt><a href="#to">to</a></dt>
<dd><p><code>glb</code>: binary container. <code>gltf</code>: self-contained JSON container with data URIs.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#MODEL_MIME">MODEL_MIME</a></dt>
<dd><p>Only the binary glTF container; .gltf JSON with external resources is not accepted.</p>
</dd>
<dt><a href="#boolParameter">boolParameter</a></dt>
<dd><p>House-standard query boolean (accepts true/false/1/0/yes/no/on/off, case-insensitive).</p>
</dd>
<dt><a href="#ModelOptimizeSchema">ModelOptimizeSchema</a></dt>
<dd><p>Flat query parameters for <code>POST /model/optimize</code>.</p>
</dd>
<dt><a href="#ModelConvertSchema">ModelConvertSchema</a></dt>
<dd><p>Flat query parameters for <code>POST /model/convert</code>.</p>
</dd>
<dt><a href="#ModelMetadataSchema">ModelMetadataSchema</a></dt>
<dd><p>Flat query parameters for <code>POST /model/metadata</code> (empty; rejects junk params).</p>
</dd>
<dt><a href="#ModelExtractSchema">ModelExtractSchema</a></dt>
<dd><p>Flat query parameters for <code>POST /model/extract</code> (empty; rejects junk params).</p>
</dd>
</dl>

<a name="compress"></a>

## compress
Compression codec for mesh data; `none` keeps uncompressed accessors.

**Kind**: global variable  
src: packages/backend/src/resources/model/schema.ts:23  
dist: packages/backend/dist/resources/model/schema.js:7
<a name="simplify"></a>

## simplify
Lossy simplification ratio in [0, 1]; 1 (default) disables it. Values < 1 force weld on.

**Kind**: global variable  
src: packages/backend/src/resources/model/schema.ts:27  
dist: packages/backend/dist/resources/model/schema.js:8
<a name="weld"></a>

## weld
Weld bitwise-identical vertices (forced on when simplify < 1); default on.

**Kind**: global variable  
src: packages/backend/src/resources/model/schema.ts:35  
dist: packages/backend/dist/resources/model/schema.js:13
<a name="to"></a>

## to
`glb`: binary container. `gltf`: self-contained JSON container with data URIs.

**Kind**: global variable  
src: packages/backend/src/resources/model/schema.ts:51  
dist: packages/backend/dist/resources/model/schema.js:18
<a name="MODEL_MIME"></a>

## MODEL\_MIME
Only the binary glTF container; .gltf JSON with external resources is not accepted.

**Kind**: global constant  
src: packages/backend/src/resources/model/schema.ts:8  
dist: packages/backend/dist/resources/model/schema.js:3
<a name="boolParameter"></a>

## boolParameter
House-standard query boolean (accepts true/false/1/0/yes/no/on/off, case-insensitive).

**Kind**: global constant  
src: packages/backend/src/resources/model/schema.ts:13  
dist: packages/backend/dist/resources/model/schema.js:4
<a name="ModelOptimizeSchema"></a>

## ModelOptimizeSchema
Flat query parameters for `POST /model/optimize`.

**Kind**: global constant  
src: packages/backend/src/resources/model/schema.ts:18  
dist: packages/backend/dist/resources/model/schema.js:5
<a name="ModelConvertSchema"></a>

## ModelConvertSchema
Flat query parameters for `POST /model/convert`.

**Kind**: global constant  
src: packages/backend/src/resources/model/schema.ts:46  
dist: packages/backend/dist/resources/model/schema.js:16
<a name="ModelMetadataSchema"></a>

## ModelMetadataSchema
Flat query parameters for `POST /model/metadata` (empty; rejects junk params).

**Kind**: global constant  
src: packages/backend/src/resources/model/schema.ts:62  
dist: packages/backend/dist/resources/model/schema.js:21
<a name="ModelExtractSchema"></a>

## ModelExtractSchema
Flat query parameters for `POST /model/extract` (empty; rejects junk params).

**Kind**: global constant  
src: packages/backend/src/resources/model/schema.ts:66  
dist: packages/backend/dist/resources/model/schema.js:22
