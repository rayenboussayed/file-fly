## Members

<dl>
<dt><a href="#ImageController">ImageController</a></dt>
<dd><p>Image routes: processor, metadata, DNA, stats and OCR (binary stream endpoints).</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#SHARP_TO_MIME">SHARP_TO_MIME</a></dt>
<dd><p>Response content-type per sharp-encodable format. <code>avif</code>/<code>jpg</code> are not
encoder keys; formats absent from this map fall back to octet-stream.</p>
</dd>
</dl>

<a name="ImageController"></a>

## ImageController
Image routes: processor, metadata, DNA, stats and OCR (binary stream endpoints).

**Kind**: global variable  
src: packages/backend/src/resources/image/image.controller.ts:45  
dist: packages/backend/dist/resources/image/image.controller.js:159
<a name="SHARP_TO_MIME"></a>

## SHARP\_TO\_MIME
Response content-type per sharp-encodable format. `avif`/`jpg` are not
encoder keys; formats absent from this map fall back to octet-stream.

**Kind**: global constant  
src: packages/backend/src/resources/image/image.controller.ts:29  
dist: packages/backend/dist/resources/image/image.controller.js:22
