## Members

<dl>
<dt><a href="#TesseractService">TesseractService</a></dt>
<dd><p>Bounded pool of tesseract.js workers.</p>
<p>Language data is downloaded on demand into <a href="TESSERACT_DIR">TESSERACT_DIR</a>. Each slot
handles one recognition job at a time; languages are switched with
<code>reinitialize</code> only when the requested set differs. Slots are recycled after
<a href="environment.TESSERACT_RECYCLE_JOBS">environment.TESSERACT_RECYCLE_JOBS</a> jobs; a slot whose job failed is
retired instead of being returned to the pool (a zombie recognition could
otherwise interleave with the next caller on the same worker).</p>
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
Bounded pool of tesseract.js workers.

Language data is downloaded on demand into [TESSERACT_DIR](TESSERACT_DIR). Each slot
handles one recognition job at a time; languages are switched with
`reinitialize` only when the requested set differs. Slots are recycled after
[environment.TESSERACT_RECYCLE_JOBS](environment.TESSERACT_RECYCLE_JOBS) jobs; a slot whose job failed is
retired instead of being returned to the pool (a zombie recognition could
otherwise interleave with the next caller on the same worker).

**Kind**: global variable  
src: packages/backend/src/resources/image/tesseract.service.ts:37  
dist: packages/backend/dist/resources/image/tesseract.service.js:15

* [TesseractService](#TesseractService)
    * [.onModuleDestroy()](#TesseractService+onModuleDestroy) ⇒ <code>Promise&lt;void&gt;</code>
    * [.onModuleInit()](#TesseractService+onModuleInit) ⇒ <code>Promise&lt;void&gt;</code>
    * [.recognize(buffer, langs)](#TesseractService+recognize) ⇒ <code>Promise&lt;ImageOcrResult&gt;</code>
    * [.retire(slot)](#TesseractService+retire) ⇒ <code>Promise&lt;void&gt;</code>

<a name="TesseractService+onModuleDestroy"></a>

### tesseractService.onModuleDestroy() ⇒ <code>Promise&lt;void&gt;</code>
Terminates every worker on shutdown.

**Kind**: instance method of [<code>TesseractService</code>](#TesseractService)  
src: packages/backend/src/resources/image/tesseract.service.ts:46  
dist: packages/backend/dist/resources/image/tesseract.service.js:20
<a name="TesseractService+onModuleInit"></a>

### tesseractService.onModuleInit() ⇒ <code>Promise&lt;void&gt;</code>
Prepares the cache directory and warms the configured preload languages.

**Kind**: instance method of [<code>TesseractService</code>](#TesseractService)  
src: packages/backend/src/resources/image/tesseract.service.ts:55  
dist: packages/backend/dist/resources/image/tesseract.service.js:25
<a name="TesseractService+recognize"></a>

### tesseractService.recognize(buffer, langs) ⇒ <code>Promise&lt;ImageOcrResult&gt;</code>
Recognizes text in the given image buffer.

**Kind**: instance method of [<code>TesseractService</code>](#TesseractService)  
**Returns**: <code>Promise&lt;ImageOcrResult&gt;</code> - Text with a per-line breakdown, normalized languages, confidence and wall time.  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>Buffer&lt;ArrayBufferLike&gt;</code> | Preprocessed (PNG) image bytes. |
| langs | <code>string[]</code> | Language codes to use (already normalized). |

src: packages/backend/src/resources/image/tesseract.service.ts:79  
dist: packages/backend/dist/resources/image/tesseract.service.js:41
<a name="TesseractService+retire"></a>

### tesseractService.retire(slot) ⇒ <code>Promise&lt;void&gt;</code>
Terminates a slot and removes it from the pool, then wakes one waiter.

**Kind**: instance method of [<code>TesseractService</code>](#TesseractService)  

| Param | Type | Description |
| --- | --- | --- |
| slot | <code>Slot</code> | Pool slot whose worker is being retired. |

src: packages/backend/src/resources/image/tesseract.service.ts:139  
dist: packages/backend/dist/resources/image/tesseract.service.js:88
<a name="SINGLE_LANG_REGEX"></a>

## SINGLE\_LANG\_REGEX
ISO 639-2 language code with an optional script suffix — tesseract's on-disk layout (`<code>.traineddata`).

**Kind**: global constant  
src: packages/backend/src/resources/image/tesseract.service.ts:17  
dist: packages/backend/dist/resources/image/tesseract.service.js:14
