## Members

<dl>
<dt><a href="#FontService">FontService</a></dt>
<dd><p>Font feature service: parses sfnt containers (metadata, extraction, shaping, subsetting).</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#signatureFormat">signatureFormat</a> ⇒ <code>string</code></dt>
<dd><p>Maps the file&#39;s magic bytes to a short format tag.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#readBody">readBody(cls)</a> ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code></dt>
<dd><p>Only font container mimes; macro/executable payloads are rejected at the boundary.</p>
</dd>
<dt><a href="#assertFontSignature">assertFontSignature(buffer)</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Signature must be a font container; closes the renamed-image and non-font holes.</p>
</dd>
<dt><a href="#parseFeatures">parseFeatures(raw)</a> ⇒ <code>Record&lt;string, boolean&gt;</code></dt>
<dd><p>Parses &#39;liga,kern,-dlig&#39; into a fontkit features record (enabled default, &#39;-&#39; disables).
Unknown 4-character tags pass through to the shaper (it ignores them); malformed tags are a client error.</p>
</dd>
</dl>

<a name="FontService"></a>

## FontService
Font feature service: parses sfnt containers (metadata, extraction, shaping, subsetting).

**Kind**: global variable  
src: packages/backend/src/resources/font/font.service.ts:166  
dist: packages/backend/dist/resources/font/font.service.js:183 (approx.)

* [FontService](#FontService)
    * [.extract(query)](#FontService+extract) ⇒ <code>Promise&lt;{ availableFeatures: string[]; collection: string[]; familyName: string; format: string; glyphs: Record&lt;string, unknown&gt;[]; numGlyphs: number; postscriptName: string; returnedGlyphs: number; }&gt;</code>
    * [.metadata(query)](#FontService+metadata) ⇒ <code>Promise&lt;{ ascent: number; availableFeatures: string[]; bbox: fontkit.BBOX; capHeight: number; characterSetSize: number; collection: string[]; copyright: string; descent: number; embedding: { bitmapOnly: boolean; editable: boolean; noEmbedding: boolean; noSubsetting: boolean; viewOnly: boolean; }; familyName: string; format: string; fullName: string; italicAngle: number; license: string; licenseURL: string; lineGap: number; namedVariations: Record&lt;string, unknown&gt;; numGlyphs: number; postscriptName: string; subfamilyName: string; underlinePosition: number; underlineThickness: number; unitsPerEm: number; variationAxes: Partial&lt;Record&lt;string, { name: string; min: number; default: number; max: number; }&gt;&gt;; version: number; weightClass: number; xHeight: number; }&gt;</code>
    * [.shape(query)](#FontService+shape) ⇒ <code>Promise&lt;{ advanceHeight: number; advanceWidth: number; bbox: fontkit.BBOX; direction: string; features: Record&lt;string, boolean&gt;; format: string; glyphs: { xAdvance: number; yAdvance: number; xOffset: number; yOffset: number; advanceWidth: number; codePoints: number[]; id: number; isLigature: boolean; isMark: boolean; name: string; }[]; language: string; script: string; }&gt;</code>
    * [.subset(query)](#FontService+subset) ⇒ <code>Promise&lt;Buffer&lt;ArrayBuffer&gt;&gt;</code>

<a name="FontService+extract"></a>

### fontService.extract(query) ⇒ <code>Promise&lt;{ availableFeatures: string[]; collection: string[]; familyName: string; format: string; glyphs: Record&lt;string, unknown&gt;[]; numGlyphs: number; postscriptName: string; returnedGlyphs: number; }&gt;</code>
Extracts every glyph's coverage and identity plus the supported OpenType features.

**Kind**: instance method of [<code>FontService</code>](#FontService)  
**Returns**: <code>Promise&lt;{ availableFeatures: string[]; collection: string[]; familyName: string; format: string; glyphs: Record&lt;string, unknown&gt;[]; numGlyphs: number; postscriptName: string; returnedGlyphs: number; }&gt;</code> - The extraction document (could be large for CJK fonts).  

| Param | Type | Description |
| --- | --- | --- |
| query | <code>{ font?: string; limit?: number; }</code> | The validated query object. |
| query.font |  | Optional collection member to select by PostScript name. |
| query.limit |  | Optional cap on the number of returned glyph records. |

src: packages/backend/src/resources/font/font.service.ts:176  
dist: packages/backend/dist/resources/font/font.service.js:208 (approx.)
<a name="FontService+metadata"></a>

### fontService.metadata(query) ⇒ <code>Promise&lt;{ ascent: number; availableFeatures: string[]; bbox: fontkit.BBOX; capHeight: number; characterSetSize: number; collection: string[]; copyright: string; descent: number; embedding: { bitmapOnly: boolean; editable: boolean; noEmbedding: boolean; noSubsetting: boolean; viewOnly: boolean; }; familyName: string; format: string; fullName: string; italicAngle: number; license: string; licenseURL: string; lineGap: number; namedVariations: Record&lt;string, unknown&gt;; numGlyphs: number; postscriptName: string; subfamilyName: string; underlinePosition: number; underlineThickness: number; unitsPerEm: number; variationAxes: Partial&lt;Record&lt;string, { name: string; min: number; default: number; max: number; }&gt;&gt;; version: number; weightClass: number; xHeight: number; }&gt;</code>
Reads the uploaded font (ClamAV-scanned, signature-gated) and normalizes its metadata.

**Kind**: instance method of [<code>FontService</code>](#FontService)  
**Returns**: <code>Promise&lt;{ ascent: number; availableFeatures: string[]; bbox: fontkit.BBOX; capHeight: number; characterSetSize: number; collection: string[]; copyright: string; descent: number; embedding: { bitmapOnly: boolean; editable: boolean; noEmbedding: boolean; noSubsetting: boolean; viewOnly: boolean; }; familyName: string; format: string; fullName: string; italicAngle: number; license: string; licenseURL: string; lineGap: number; namedVariations: Record&lt;string, unknown&gt;; numGlyphs: number; postscriptName: string; subfamilyName: string; underlinePosition: number; underlineThickness: number; unitsPerEm: number; variationAxes: Partial&lt;Record&lt;string, { name: string; min: number; default: number; max: number; }&gt;&gt;; version: number; weightClass: number; xHeight: number; }&gt;</code> - The font metadata document.  

| Param | Type | Description |
| --- | --- | --- |
| query | <code>{ font?: string; }</code> | The validated query object. |
| query.font |  | Optional collection member to select by PostScript name. |

src: packages/backend/src/resources/font/font.service.ts:226  
dist: packages/backend/dist/resources/font/font.service.js:260 (approx.)
<a name="FontService+shape"></a>

### fontService.shape(query) ⇒ <code>Promise&lt;{ advanceHeight: number; advanceWidth: number; bbox: fontkit.BBOX; direction: string; features: Record&lt;string, boolean&gt;; format: string; glyphs: { xAdvance: number; yAdvance: number; xOffset: number; yOffset: number; advanceWidth: number; codePoints: number[]; id: number; isLigature: boolean; isMark: boolean; name: string; }[]; language: string; script: string; }&gt;</code>
Shapes text with the font's OpenType engine.

**Kind**: instance method of [<code>FontService</code>](#FontService)  
**Returns**: <code>Promise&lt;{ advanceHeight: number; advanceWidth: number; bbox: fontkit.BBOX; direction: string; features: Record&lt;string, boolean&gt;; format: string; glyphs: { xAdvance: number; yAdvance: number; xOffset: number; yOffset: number; advanceWidth: number; codePoints: number[]; id: number; isLigature: boolean; isMark: boolean; name: string; }[]; language: string; script: string; }&gt;</code> - The glyph run with positions and aggregate metrics.  

| Param | Type | Description |
| --- | --- | --- |
| query | <code>{ direction?: &quot;auto&quot; \| &quot;ltr&quot; \| &quot;rtl&quot;; features?: string; font?: string; language?: string; script?: string; text: string; }</code> | The validated query object. |
| query.direction |  | Optional direction override; defaults to the script default. |
| query.features |  | Optional `+tag`/`-tag`/`tag` comma-separated feature overrides. |
| query.font |  | Optional collection member to select by PostScript name. |
| query.language |  | Optional language override; defaults to the script default. |
| query.script |  | Optional script override; defaults to detection. |
| query.text |  | The text to shape. |

src: packages/backend/src/resources/font/font.service.ts:248  
dist: packages/backend/dist/resources/font/font.service.js:282 (approx.)
<a name="FontService+subset"></a>

### fontService.subset(query) ⇒ <code>Promise&lt;Buffer&lt;ArrayBuffer&gt;&gt;</code>
Subsets the font to the glyphs needed for the given text.
The output is a minimal sfnt intended for PDF embedding (no cmap); it is not
a standalone web font.

**Kind**: instance method of [<code>FontService</code>](#FontService)  
**Returns**: <code>Promise&lt;Buffer&lt;ArrayBuffer&gt;&gt;</code> - The subsetted sfnt bytes.  

| Param | Type | Description |
| --- | --- | --- |
| query | <code>{ font?: string; text: string; }</code> | The validated query object. |
| query.font |  | Optional collection member to select by PostScript name. |
| query.text |  | The text whose glyphs are kept. |

src: packages/backend/src/resources/font/font.service.ts:306  
dist: packages/backend/dist/resources/font/font.service.js:327 (approx.)
<a name="signatureFormat"></a>

## signatureFormat ⇒ <code>string</code>
Maps the file's magic bytes to a short format tag.

**Kind**: global constant  
**Returns**: <code>string</code> - The format tag (ttf, otf, woff, woff2).  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>Buffer&lt;ArrayBufferLike&gt;</code> | The buffered upload. |

src: packages/backend/src/resources/font/font.service.ts:107  
dist: packages/backend/dist/resources/font/font.service.js:80
<a name="readBody"></a>

## readBody(cls) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>
Only font container mimes; macro/executable payloads are rejected at the boundary.

**Kind**: global function  
**Returns**: <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code> - The body bytes, capped.  

| Param | Type | Description |
| --- | --- | --- |
| cls | <code>NormalizedClsService</code> | Normalized request context. |

src: packages/backend/src/resources/font/font.service.ts:21  
dist: packages/backend/dist/resources/font/font.service.js:18
<a name="assertFontSignature"></a>

## assertFontSignature(buffer) ⇒ <code>Promise&lt;void&gt;</code>
Signature must be a font container; closes the renamed-image and non-font holes.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>Buffer&lt;ArrayBufferLike&gt;</code> | The buffered upload. |

src: packages/backend/src/resources/font/font.service.ts:39  
dist: packages/backend/dist/resources/font/font.service.js:31
<a name="parseFeatures"></a>

## parseFeatures(raw) ⇒ <code>Record&lt;string, boolean&gt;</code>
Parses 'liga,kern,-dlig' into a fontkit features record (enabled default, '-' disables).
Unknown 4-character tags pass through to the shaper (it ignores them); malformed tags are a client error.

**Kind**: global function  
**Returns**: <code>Record&lt;string, boolean&gt;</code> - The features record, or undefined when no features were given.  

| Param | Type | Description |
| --- | --- | --- |
| raw | <code>string</code> | The raw feature string from the query. |

src: packages/backend/src/resources/font/font.service.ts:345  
dist: packages/backend/dist/resources/font/font.service.js:369 (approx.)
