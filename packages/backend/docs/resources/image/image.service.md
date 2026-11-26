## Members

<dl>
<dt><a href="#ImageService">ImageService</a></dt>
<dd><p>Image feature service: streams uploads through sharp workers for processing, metadata, DNA, stats and OCR.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#parseLangs">parseLangs(raw)</a> ⇒ <code>string[]</code></dt>
<dd><p>Normalizes the <code>lang</code> query value: splits on <code>+</code> or <code>,</code>, lowercases,
trims, dedupes, sorts; defaults to <code>[&#39;eng&#39;]</code>, caps at 4 codes.</p>
</dd>
<dt><a href="#preprocess">preprocess(input, logger)</a> ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code></dt>
<dd><p>Preprocesses an image for OCR: auto-orient, downscale to at most 2000 px
without enlarging, greyscale, normalize, sharpen; encoded as PNG.
Pixel bombs are rejected via <code>limitInputPixels</code>; undecodable or malicious
input surfaces as <a href="UnsupportedMediaTypeException">UnsupportedMediaTypeException</a> instead of a 500.</p>
</dd>
</dl>

<a name="ImageService"></a>

## ImageService
Image feature service: streams uploads through sharp workers for processing, metadata, DNA, stats and OCR.

**Kind**: global variable  
src: packages/backend/src/resources/image/image.service.ts:71  
dist: packages/backend/dist/resources/image/image.service.js:49
<a name="parseLangs"></a>

## parseLangs(raw) ⇒ <code>string[]</code>
Normalizes the `lang` query value: splits on `+` or `,`, lowercases,
trims, dedupes, sorts; defaults to `['eng']`, caps at 4 codes.

**Kind**: global function  
**Returns**: <code>string[]</code> - Sorted, deduped language codes.  

| Param | Type | Description |
| --- | --- | --- |
| raw | <code>string</code> | Raw `lang` query parameter (already regex-validated). |

src: packages/backend/src/resources/image/image.service.ts:27  
dist: packages/backend/dist/resources/image/image.service.js:22
<a name="preprocess"></a>

## preprocess(input, logger) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>
Preprocesses an image for OCR: auto-orient, downscale to at most 2000 px
without enlarging, greyscale, normalize, sharpen; encoded as PNG.
Pixel bombs are rejected via `limitInputPixels`; undecodable or malicious
input surfaces as [UnsupportedMediaTypeException](UnsupportedMediaTypeException) instead of a 500.

**Kind**: global function  
**Returns**: <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code> - PNG bytes ready for tesseract.  

| Param | Type | Description |
| --- | --- | --- |
| input | <code>Buffer&lt;ArrayBufferLike&gt;</code> | Raw (signature-verified) image bytes. |
| logger | <code>Logger</code> | Logger used to record decode failures for operators. |

src: packages/backend/src/resources/image/image.service.ts:49  
dist: packages/backend/dist/resources/image/image.service.js:33
