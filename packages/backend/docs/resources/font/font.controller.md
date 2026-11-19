<a name="FontController"></a>

## FontController
Font routes. All routes take the binary upload and bypass the JSON parser by
design; they are ClamAV-scanned and font-signature gated (TTF/OTF/WOFF/WOFF2/TTC).

**Kind**: global variable  
src: packages/backend/src/resources/font/font.controller.ts:37  
dist: packages/backend/dist/resources/font/font.controller.js:22

* [FontController](#FontController)
    * [.extract(query)](#FontController+extract) ⇒ <code>Promise&lt;{ availableFeatures: string[]; collection: string[]; familyName: string; format: string; glyphs: Record&lt;string, unknown&gt;[]; numGlyphs: number; postscriptName: string; returnedGlyphs: number; }&gt;</code>
    * [.metadata(query)](#FontController+metadata) ⇒ <code>Promise&lt;{ ascent: number; availableFeatures: string[]; bbox: import(&quot;fontkit&quot;).BBOX; capHeight: number; characterSetSize: number; collection: string[]; copyright: string; descent: number; embedding: { bitmapOnly: boolean; editable: boolean; noEmbedding: boolean; noSubsetting: boolean; viewOnly: boolean; }; familyName: string; format: string; fullName: string; italicAngle: number; license: string; licenseURL: string; lineGap: number; namedVariations: Record&lt;string, unknown&gt;; numGlyphs: number; postscriptName: string; subfamilyName: string; underlinePosition: number; underlineThickness: number; unitsPerEm: number; variationAxes: Partial&lt;Record&lt;string, { name: string; min: number; default: number; max: number; }&gt;&gt;; version: number; weightClass: number; xHeight: number; }&gt;</code>
    * [.shape(query)](#FontController+shape) ⇒ <code>Promise&lt;{ advanceHeight: number; advanceWidth: number; bbox: import(&quot;fontkit&quot;).BBOX; direction: string; features: Record&lt;string, boolean&gt;; format: string; glyphs: { xAdvance: number; yAdvance: number; xOffset: number; yOffset: number; advanceWidth: number; codePoints: number[]; id: number; isLigature: boolean; isMark: boolean; name: string; }[]; language: string; script: string; }&gt;</code>
    * [.subset(response, query)](#FontController+subset) ⇒ <code>Promise&lt;void&gt;</code>

<a name="FontController+extract"></a>

### fontController.extract(query) ⇒ <code>Promise&lt;{ availableFeatures: string[]; collection: string[]; familyName: string; format: string; glyphs: Record&lt;string, unknown&gt;[]; numGlyphs: number; postscriptName: string; returnedGlyphs: number; }&gt;</code>
Extracts the font's coverage and glyph inventory (201).

**Kind**: instance method of [<code>FontController</code>](#FontController)  
**Returns**: <code>Promise&lt;{ availableFeatures: string[]; collection: string[]; familyName: string; format: string; glyphs: Record&lt;string, unknown&gt;[]; numGlyphs: number; postscriptName: string; returnedGlyphs: number; }&gt;</code> - The extraction document.  

| Param | Type | Description |
| --- | --- | --- |
| query | <code>{ [x: string]: any; limit?: number; }</code> | Optional collection member. |

src: packages/backend/src/resources/font/font.controller.ts:50  
dist: packages/backend/dist/resources/font/font.controller.js:29
<a name="FontController+metadata"></a>

### fontController.metadata(query) ⇒ <code>Promise&lt;{ ascent: number; availableFeatures: string[]; bbox: import(&quot;fontkit&quot;).BBOX; capHeight: number; characterSetSize: number; collection: string[]; copyright: string; descent: number; embedding: { bitmapOnly: boolean; editable: boolean; noEmbedding: boolean; noSubsetting: boolean; viewOnly: boolean; }; familyName: string; format: string; fullName: string; italicAngle: number; license: string; licenseURL: string; lineGap: number; namedVariations: Record&lt;string, unknown&gt;; numGlyphs: number; postscriptName: string; subfamilyName: string; underlinePosition: number; underlineThickness: number; unitsPerEm: number; variationAxes: Partial&lt;Record&lt;string, { name: string; min: number; default: number; max: number; }&gt;&gt;; version: number; weightClass: number; xHeight: number; }&gt;</code>
Normalized font metadata (201).

**Kind**: instance method of [<code>FontController</code>](#FontController)  
**Returns**: <code>Promise&lt;{ ascent: number; availableFeatures: string[]; bbox: import(&quot;fontkit&quot;).BBOX; capHeight: number; characterSetSize: number; collection: string[]; copyright: string; descent: number; embedding: { bitmapOnly: boolean; editable: boolean; noEmbedding: boolean; noSubsetting: boolean; viewOnly: boolean; }; familyName: string; format: string; fullName: string; italicAngle: number; license: string; licenseURL: string; lineGap: number; namedVariations: Record&lt;string, unknown&gt;; numGlyphs: number; postscriptName: string; subfamilyName: string; underlinePosition: number; underlineThickness: number; unitsPerEm: number; variationAxes: Partial&lt;Record&lt;string, { name: string; min: number; default: number; max: number; }&gt;&gt;; version: number; weightClass: number; xHeight: number; }&gt;</code> - The metadata document.  

| Param | Type | Description |
| --- | --- | --- |
| query | <code>{ [x: string]: any; }</code> | Optional collection member. |

src: packages/backend/src/resources/font/font.controller.ts:63  
dist: packages/backend/dist/resources/font/font.controller.js:32
<a name="FontController+shape"></a>

### fontController.shape(query) ⇒ <code>Promise&lt;{ advanceHeight: number; advanceWidth: number; bbox: import(&quot;fontkit&quot;).BBOX; direction: string; features: Record&lt;string, boolean&gt;; format: string; glyphs: { xAdvance: number; yAdvance: number; xOffset: number; yOffset: number; advanceWidth: number; codePoints: number[]; id: number; isLigature: boolean; isMark: boolean; name: string; }[]; language: string; script: string; }&gt;</code>
Shapes text with the font's OpenType engine (201).

**Kind**: instance method of [<code>FontController</code>](#FontController)  
**Returns**: <code>Promise&lt;{ advanceHeight: number; advanceWidth: number; bbox: import(&quot;fontkit&quot;).BBOX; direction: string; features: Record&lt;string, boolean&gt;; format: string; glyphs: { xAdvance: number; yAdvance: number; xOffset: number; yOffset: number; advanceWidth: number; codePoints: number[]; id: number; isLigature: boolean; isMark: boolean; name: string; }[]; language: string; script: string; }&gt;</code> - The shaped glyph run.  

| Param | Type | Description |
| --- | --- | --- |
| query | <code>{ [x: string]: any; direction?: &quot;auto&quot; \| &quot;ltr&quot; \| &quot;rtl&quot;; }</code> | Text plus optional script/language/direction/features. |

src: packages/backend/src/resources/font/font.controller.ts:76  
dist: packages/backend/dist/resources/font/font.controller.js:35
<a name="FontController+subset"></a>

### fontController.subset(response, query) ⇒ <code>Promise&lt;void&gt;</code>
Subsets the font to the glyphs needed for the given text (201).
The output is a minimal sfnt for PDF embedding (no cmap); it is not a web font.

**Kind**: instance method of [<code>FontController</code>](#FontController)  
**Returns**: <code>Promise&lt;void&gt;</code> - The subsetted font bytes (201).  

| Param | Type | Description |
| --- | --- | --- |
| response | <code>FastifyReply&lt;import(&quot;fastify&quot;).RouteGenericInterface, import(&quot;fastify&quot;).RawServerDefault, import(&quot;http&quot;).IncomingMessage, import(&quot;http&quot;).ServerResponse&lt;import(&quot;http&quot;).IncomingMessage&gt;, unknown, import(&quot;fastify&quot;).FastifySchema, import(&quot;fastify&quot;).FastifyTypeProviderDefault, unknown&gt;</code> | Raw reply, streamed as font/ttf. |
| query | <code>{ [x: string]: any; }</code> | The text to include. |

src: packages/backend/src/resources/font/font.controller.ts:91  
dist: packages/backend/dist/resources/font/font.controller.js:38
