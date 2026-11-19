<a name="ImageService"></a>

## ImageService
Image feature service: streams uploads through sharp workers for processing, metadata, DNA, stats and OCR.

**Kind**: global variable  
src: packages/backend/src/resources/image/image.service.ts:20  
dist: packages/backend/dist/resources/image/image.service.js:42 (approx.)

* [ImageService](#ImageService)
    * [.parseLangs(raw)](#ImageService+parseLangs) ⇒ <code>string[]</code>
    * [.preprocess(input)](#ImageService+preprocess) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>

<a name="ImageService+parseLangs"></a>

### imageService.parseLangs(raw) ⇒ <code>string[]</code>
Normalizes the `lang` query value: splits on `+` or `,`, lowercases,
trims, dedupes, sorts; defaults to `['eng']`, caps at 4 codes.

**Kind**: instance method of [<code>ImageService</code>](#ImageService)  
**Returns**: <code>string[]</code> - Sorted, deduped language codes.  

| Param | Type | Description |
| --- | --- | --- |
| raw | <code>string</code> | Raw `lang` query parameter (already regex-validated). |

src: packages/backend/src/resources/image/image.service.ts:110  
dist: packages/backend/dist/resources/image/image.service.js:138 (approx.)
<a name="ImageService+preprocess"></a>

### imageService.preprocess(input) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>
Preprocesses an image for OCR: auto-orient, downscale to at most 2000 px
without enlarging, greyscale, normalize, sharpen; encoded as PNG.
Pixel bombs are rejected via `limitInputPixels`; undecodable or malicious
input surfaces as [UnsupportedMediaTypeException](UnsupportedMediaTypeException) instead of a 500.

**Kind**: instance method of [<code>ImageService</code>](#ImageService)  
**Returns**: <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code> - PNG bytes ready for tesseract.  

| Param | Type | Description |
| --- | --- | --- |
| input | <code>Buffer&lt;ArrayBufferLike&gt;</code> | Raw (signature-verified) image bytes. |

src: packages/backend/src/resources/image/image.service.ts:131  
dist: packages/backend/dist/resources/image/image.service.js:157 (approx.)
