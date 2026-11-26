## Members

<dl>
<dt><a href="#TesseractService">TesseractService</a></dt>
<dd><p>Bounded pool of tesseract.js workers for <code>/image/ocr</code>; terminated on shutdown.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#SINGLE_LANG_REGEX">SINGLE_LANG_REGEX</a></dt>
<dd><p>ISO 639-2 language code with an optional script suffix — tesseract&#39;s on-disk layout (<code>&lt;code&gt;.traineddata</code>).</p>
</dd>
</dl>

<a name="TesseractService"></a>

## TesseractService
Bounded pool of tesseract.js workers for `/image/ocr`; terminated on shutdown.

**Kind**: global variable  
src: packages/backend/src/resources/image/tesseract.service.ts:43  
dist: packages/backend/dist/resources/image/tesseract.service.js:16

* [TesseractService](#TesseractService)
    * [.onModuleDestroy()](#TesseractService+onModuleDestroy) ⇒ <code>Promise&lt;void&gt;</code>
    * [.onModuleInit()](#TesseractService+onModuleInit) ⇒ <code>Promise&lt;void&gt;</code>
    * [.recognize(buffer, langs)](#TesseractService+recognize) ⇒ <code>Promise&lt;ImageOcrResult&gt;</code>
    * [.retire(slot)](#TesseractService+retire) ⇒ <code>Promise&lt;void&gt;</code>

<a name="TesseractService+onModuleDestroy"></a>

### tesseractService.onModuleDestroy() ⇒ <code>Promise&lt;void&gt;</code>
Terminates every worker on shutdown and wakes pending acquire() callers
so they fail fast with 503 instead of waiting for a slot forever.

**Kind**: instance method of [<code>TesseractService</code>](#TesseractService)  
src: packages/backend/src/resources/image/tesseract.service.ts:68  
dist: packages/backend/dist/resources/image/tesseract.service.js:36
<a name="TesseractService+onModuleInit"></a>

### tesseractService.onModuleInit() ⇒ <code>Promise&lt;void&gt;</code>
Prepares the cache directory and warms the configured preload languages.

**Kind**: instance method of [<code>TesseractService</code>](#TesseractService)  
src: packages/backend/src/resources/image/tesseract.service.ts:79  
dist: packages/backend/dist/resources/image/tesseract.service.js:44
<a name="TesseractService+recognize"></a>

### tesseractService.recognize(buffer, langs) ⇒ <code>Promise&lt;ImageOcrResult&gt;</code>
Recognizes text in the given image buffer.

**Kind**: instance method of [<code>TesseractService</code>](#TesseractService)  
**Returns**: <code>Promise&lt;ImageOcrResult&gt;</code> - Text with a per-line breakdown, normalized languages, confidence and wall time.  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>Buffer&lt;ArrayBufferLike&gt;</code> | Preprocessed (PNG) image bytes. |
| langs | <code>string[]</code> | Language codes to use (already normalized). |

src: packages/backend/src/resources/image/tesseract.service.ts:103  
dist: packages/backend/dist/resources/image/tesseract.service.js:60
<a name="TesseractService+retire"></a>

### tesseractService.retire(slot) ⇒ <code>Promise&lt;void&gt;</code>
Terminates a slot and removes it from the pool, then wakes one waiter.

**Kind**: instance method of [<code>TesseractService</code>](#TesseractService)  

| Param | Type | Description |
| --- | --- | --- |
| slot | <code>Slot</code> | Pool slot whose worker is being retired. |

src: packages/backend/src/resources/image/tesseract.service.ts:149  
dist: packages/backend/dist/resources/image/tesseract.service.js:95
<a name="SINGLE_LANG_REGEX"></a>

## SINGLE\_LANG\_REGEX
ISO 639-2 language code with an optional script suffix — tesseract's on-disk layout (`<code>.traineddata`).

**Kind**: global constant  
src: packages/backend/src/resources/image/tesseract.service.ts:20  
dist: packages/backend/dist/resources/image/tesseract.service.js:15
