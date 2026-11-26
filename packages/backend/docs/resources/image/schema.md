## Constants

<dl>
<dt><a href="#positionKeys">positionKeys</a></dt>
<dd><p>resize position accepts sharp&#39;s corner/edge names plus everything in sharp.gravity.</p>
</dd>
<dt><a href="#ImageProcessorSchema">ImageProcessorSchema</a></dt>
<dd><p>Query parameters for <code>/image/processor</code>, <code>/image/metadata</code>, <code>/image/dna</code> and <code>/image/stats</code> uploads.</p>
</dd>
<dt><a href="#LANG_REGEX">LANG_REGEX</a></dt>
<dd><p>Case-insensitive language code pattern: a three-letter ISO 639-2 code
optionally followed by a script suffix (<code>_latn</code>, <code>_cyrl</code>, ...). Codes are
combined with <code>+</code> or <code>,</code> (up to four). <code>+</code> only reaches this endpoint
URL-encoded (<code>%2B</code>), because query-string decoders treat a raw <code>+</code> as a space.</p>
</dd>
<dt><a href="#OcrSchema">OcrSchema</a></dt>
<dd><p>Query schema for the <code>/image/ocr</code> endpoint.</p>
</dd>
</dl>

<a name="positionKeys"></a>

## positionKeys
resize position accepts sharp's corner/edge names plus everything in sharp.gravity.

**Kind**: global constant  
src: packages/backend/src/resources/image/schema.ts:16  
dist: packages/backend/dist/resources/image/schema.js:8
<a name="ImageProcessorSchema"></a>

## ImageProcessorSchema
Query parameters for `/image/processor`, `/image/metadata`, `/image/dna` and `/image/stats` uploads.

**Kind**: global constant  
src: packages/backend/src/resources/image/schema.ts:33  
dist: packages/backend/dist/resources/image/schema.js:20
<a name="LANG_REGEX"></a>

## LANG\_REGEX
Case-insensitive language code pattern: a three-letter ISO 639-2 code
optionally followed by a script suffix (`_latn`, `_cyrl`, ...). Codes are
combined with `+` or `,` (up to four). `+` only reaches this endpoint
URL-encoded (`%2B`), because query-string decoders treat a raw `+` as a space.

**Kind**: global constant  
src: packages/backend/src/resources/image/schema.ts:70  
dist: packages/backend/dist/resources/image/schema.js:44
<a name="OcrSchema"></a>

## OcrSchema
Query schema for the `/image/ocr` endpoint.

**Kind**: global constant  
src: packages/backend/src/resources/image/schema.ts:75  
dist: packages/backend/dist/resources/image/schema.js:45
