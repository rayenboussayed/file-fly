## Members

<dl>
<dt><a href="#PptxService">PptxService</a></dt>
<dd><p>PPTX feature service: builds decks and parses/metadata-inspects uploads.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#readPartsCapped">readPartsCapped(buffer, limits)</a> ⇒</dt>
<dd><p>Maps the shared OOXML reader&#39;s cap violations to HTTP errors (413 for size, 400 otherwise).</p>
</dd>
<dt><a href="#assertHyperlinkScheme">assertHyperlinkScheme(record)</a></dt>
<dd><p>Validates the run-level hyperlink allowlist.</p>
</dd>
<dt><a href="#assertBuildPayload">assertBuildPayload(body)</a></dt>
<dd><p>Rejects payloads whose serialized size or element count could exhaust memory.</p>
</dd>
<dt><a href="#readBody">readBody(cls)</a> ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code></dt>
<dd><p>Opens the uploaded body, bounded by the scanner cap.</p>
</dd>
<dt><a href="#assertPptxSignature">assertPptxSignature(buffer)</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Signature must be the plain pptx mime; closes the renamed-image and .potm/.pptm holes.</p>
</dd>
<dt><a href="#extractPptx">extractPptx(parts)</a> ⇒ <code>{ slides: { index: number; part: string; texts: any[]; }[]; }</code></dt>
<dd><p>Extracts every slide&#39;s shape text, in presentation order.</p>
</dd>
<dt><a href="#collectNotes">collectNotes(parts)</a> ⇒ <code>string[]</code></dt>
<dd><p>Notes text per notes slide, sorted by the numeric suffix. The slide-number
placeholder shape (<code>ph type=&quot;sldNum&quot;</code>) is excluded, so cached slide numbers
do not leak into the notes.</p>
</dd>
</dl>

<a name="PptxService"></a>

## PptxService
PPTX feature service: builds decks and parses/metadata-inspects uploads.

**Kind**: global variable  
src: packages/backend/src/resources/pptx/pptx.service.ts:249  
dist: packages/backend/dist/resources/pptx/pptx.service.js:207

* [PptxService](#PptxService)
    * [.build(body)](#PptxService+build) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>
    * [.extract()](#PptxService+extract) ⇒ <code>Promise&lt;{ format: string; metadata: any; structure: { notes: string[]; slides: { index: number; part: string; texts: any[]; }[]; text: string; }; }&gt;</code>
    * [.metadata()](#PptxService+metadata) ⇒ <code>Promise&lt;any&gt;</code>

<a name="PptxService+build"></a>

### pptxService.build(body) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>
Builds a .pptx from the payload in a worker thread and returns the bytes.
Buffers before returning so a worker failure answers 500, never a truncated 201.

**Kind**: instance method of [<code>PptxService</code>](#PptxService)  
**Returns**: <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code> - The .pptx bytes.  

| Param | Type | Description |
| --- | --- | --- |
| body | <code>{ layout: &quot;LAYOUT\_16x9&quot; \| &quot;LAYOUT\_16x10&quot; \| &quot;LAYOUT\_4x3&quot; \| &quot;LAYOUT\_WIDE&quot;; slides: { elements: ({ h: number; w: number; x: number; y: number; chartType: &quot;line&quot; \| &quot;bar&quot; \| &quot;pie&quot; \| &quot;bar3d&quot; \| &quot;doughnut&quot; \| &quot;area&quot; \| &quot;scatter&quot; \| &quot;radar&quot;; series: { labels: string[]; values: number[]; name?: string; }[]; type: &quot;chart&quot;; chartColors?: any[]; showLegend?: boolean; showValue?: boolean; title?: string; } \| { h: number; w: number; x: number; y: number; runs: { [x: string]: any; text: string; bold?: boolean; breakLine?: boolean; bullet?: boolean \| { code?: string; }; fontFace?: string; fontSize?: number; hyperlink?: { slide?: number; url?: string; }; indentLevel?: number; italic?: boolean; lang?: string; strike?: boolean; subScript?: boolean; superScript?: boolean; underline?: boolean; }[]; type: &quot;text&quot;; align?: &quot;left&quot; \| &quot;center&quot; \| &quot;right&quot; \| &quot;justify&quot;; bullet?: boolean \| { code?: string; }; fill?: { [x: string]: any; }; fit?: &quot;none&quot; \| &quot;resize&quot; \| &quot;shrink&quot;; indentLevel?: number; line?: { [x: string]: any; width?: number; }; lineSpacing?: number; margin?: number; rotation?: number; rtl?: boolean; valign?: &quot;bottom&quot; \| &quot;top&quot; \| &quot;middle&quot;; } \| { h: number; w: number; x: number; y: number; shape: &quot;wave&quot; \| &quot;diagStripe&quot; \| &quot;line&quot; \| &quot;doubleWave&quot; \| &quot;frame&quot; \| &quot;rect&quot; \| &quot;ellipse&quot; \| &quot;accentBorderCallout1&quot; \| &quot;accentBorderCallout2&quot; \| &quot;accentBorderCallout3&quot; \| &quot;accentCallout1&quot; \| &quot;accentCallout2&quot; \| &quot;accentCallout3&quot; \| &quot;actionButtonBackPrevious&quot; \| &quot;actionButtonBeginning&quot; \| &quot;actionButtonBlank&quot; \| &quot;actionButtonDocument&quot; \| &quot;actionButtonEnd&quot; \| &quot;actionButtonForwardNext&quot; \| &quot;actionButtonHelp&quot; \| &quot;actionButtonHome&quot; \| &quot;actionButtonInformation&quot; \| &quot;actionButtonMovie&quot; \| &quot;actionButtonReturn&quot; \| &quot;actionButtonSound&quot; \| &quot;arc&quot; \| &quot;bentArrow&quot; \| &quot;bentUpArrow&quot; \| &quot;bevel&quot; \| &quot;blockArc&quot; \| &quot;borderCallout1&quot; \| &quot;borderCallout2&quot; \| &quot;borderCallout3&quot; \| &quot;bracePair&quot; \| &quot;bracketPair&quot; \| &quot;callout1&quot; \| &quot;callout2&quot; \| &quot;callout3&quot; \| &quot;can&quot; \| &quot;chartPlus&quot; \| &quot;chartStar&quot; \| &quot;chartX&quot; \| &quot;chevron&quot; \| &quot;chord&quot; \| &quot;circularArrow&quot; \| &quot;cloud&quot; \| &quot;cloudCallout&quot; \| &quot;corner&quot; \| &quot;cornerTabs&quot; \| &quot;cube&quot; \| &quot;curvedDownArrow&quot; \| &quot;curvedLeftArrow&quot; \| &quot;curvedRightArrow&quot; \| &quot;curvedUpArrow&quot; \| &quot;custGeom&quot; \| &quot;decagon&quot; \| &quot;diamond&quot; \| &quot;dodecagon&quot; \| &quot;donut&quot; \| &quot;downArrow&quot; \| &quot;downArrowCallout&quot; \| &quot;ellipseRibbon&quot; \| &quot;ellipseRibbon2&quot; \| &quot;flowChartAlternateProcess&quot; \| &quot;flowChartCollate&quot; \| &quot;flowChartConnector&quot; \| &quot;flowChartDecision&quot; \| &quot;flowChartDelay&quot; \| &quot;flowChartDisplay&quot; \| &quot;flowChartDocument&quot; \| &quot;flowChartExtract&quot; \| &quot;flowChartInputOutput&quot; \| &quot;flowChartInternalStorage&quot; \| &quot;flowChartMagneticDisk&quot; \| &quot;flowChartMagneticDrum&quot; \| &quot;flowChartMagneticTape&quot; \| &quot;flowChartManualInput&quot; \| &quot;flowChartManualOperation&quot; \| &quot;flowChartMerge&quot; \| &quot;flowChartMultidocument&quot; \| &quot;flowChartOfflineStorage&quot; \| &quot;flowChartOffpageConnector&quot; \| &quot;flowChartOnlineStorage&quot; \| &quot;flowChartOr&quot; \| &quot;flowChartPredefinedProcess&quot; \| &quot;flowChartPreparation&quot; \| &quot;flowChartProcess&quot; \| &quot;flowChartPunchedCard&quot; \| &quot;flowChartPunchedTape&quot; \| &quot;flowChartSort&quot; \| &quot;flowChartSummingJunction&quot; \| &quot;flowChartTerminator&quot; \| &quot;folderCorner&quot; \| &quot;funnel&quot; \| &quot;gear6&quot; \| &quot;gear9&quot; \| &quot;halfFrame&quot; \| &quot;heart&quot; \| &quot;heptagon&quot; \| &quot;hexagon&quot; \| &quot;homePlate&quot; \| &quot;horizontalScroll&quot; \| &quot;irregularSeal1&quot; \| &quot;irregularSeal2&quot; \| &quot;leftArrow&quot; \| &quot;leftArrowCallout&quot; \| &quot;leftBrace&quot; \| &quot;leftBracket&quot; \| &quot;leftCircularArrow&quot; \| &quot;leftRightArrow&quot; \| &quot;leftRightArrowCallout&quot; \| &quot;leftRightCircularArrow&quot; \| &quot;leftRightRibbon&quot; \| &quot;leftRightUpArrow&quot; \| &quot;leftUpArrow&quot; \| &quot;lightningBolt&quot; \| &quot;lineInv&quot; \| &quot;mathDivide&quot; \| &quot;mathEqual&quot; \| &quot;mathMinus&quot; \| &quot;mathMultiply&quot; \| &quot;mathNotEqual&quot; \| &quot;mathPlus&quot; \| &quot;moon&quot; \| &quot;noSmoking&quot; \| &quot;nonIsoscelesTrapezoid&quot; \| &quot;notchedRightArrow&quot; \| &quot;octagon&quot; \| &quot;parallelogram&quot; \| &quot;pentagon&quot; \| &quot;pie&quot; \| &quot;pieWedge&quot; \| &quot;plaque&quot; \| &quot;plaqueTabs&quot; \| &quot;plus&quot; \| &quot;quadArrow&quot; \| &quot;quadArrowCallout&quot; \| &quot;ribbon&quot; \| &quot;ribbon2&quot; \| &quot;rightArrow&quot; \| &quot;rightArrowCallout&quot; \| &quot;rightBrace&quot; \| &quot;rightBracket&quot; \| &quot;round1Rect&quot; \| &quot;round2DiagRect&quot; \| &quot;round2SameRect&quot; \| &quot;roundRect&quot; \| &quot;rtTriangle&quot; \| &quot;smileyFace&quot; \| &quot;snip1Rect&quot; \| &quot;snip2DiagRect&quot; \| &quot;snip2SameRect&quot; \| &quot;snipRoundRect&quot; \| &quot;squareTabs&quot; \| &quot;star10&quot; \| &quot;star12&quot; \| &quot;star16&quot; \| &quot;star24&quot; \| &quot;star32&quot; \| &quot;star4&quot; \| &quot;star5&quot; \| &quot;star6&quot; \| &quot;star7&quot; \| &quot;star8&quot; \| &quot;stripedRightArrow&quot; \| &quot;sun&quot; \| &quot;swooshArrow&quot; \| &quot;teardrop&quot; \| &quot;trapezoid&quot; \| &quot;triangle&quot; \| &quot;upArrow&quot; \| &quot;upArrowCallout&quot; \| &quot;upDownArrow&quot; \| &quot;upDownArrowCallout&quot; \| &quot;uturnArrow&quot; \| &quot;verticalScroll&quot; \| &quot;wedgeEllipseCallout&quot; \| &quot;wedgeRectCallout&quot; \| &quot;wedgeRoundRectCallout&quot;; type: &quot;shape&quot;; fill?: { [x: string]: any; }; line?: { [x: string]: any; width?: number; }; rotation?: number; text?: { [x: string]: any; text: string; bold?: boolean; breakLine?: boolean; bullet?: boolean \| { code?: string; }; fontFace?: string; fontSize?: number; hyperlink?: { slide?: number; url?: string; }; indentLevel?: number; italic?: boolean; lang?: string; strike?: boolean; subScript?: boolean; superScript?: boolean; underline?: boolean; }[]; } \| { h: number; w: number; x: number; y: number; rows: { text: string; colSpan?: number; fill?: { [x: string]: any; }; options?: { colspan?: number; fill?: { [x: string]: any; }; margin?: number; rowspan?: number; valign?: &quot;bottom&quot; \| &quot;top&quot; \| &quot;middle&quot;; }; rowSpan?: number; }[][]; type: &quot;table&quot;; margin?: number; } \| { h: number; w: number; x: number; y: number; data: string; imageType: &quot;png&quot; \| &quot;jpg&quot; \| &quot;gif&quot; \| &quot;bmp&quot;; type: &quot;image&quot;; altText?: string; sizing?: { h: number; type: &quot;contain&quot; \| &quot;cover&quot; \| &quot;crop&quot;; w: number; }; transparency?: number; })[]; background?: { [x: string]: any; }; notes?: string; }[]; metadata?: { author?: string; company?: string; revision?: string; subject?: string; title?: string; }; theme?: { bodyFontFace?: string; headFontFace?: string; }; }</code> | Validated build payload. |

src: packages/backend/src/resources/pptx/pptx.service.ts:261  
dist: packages/backend/dist/resources/pptx/pptx.service.js:214
<a name="PptxService+extract"></a>

### pptxService.extract() ⇒ <code>Promise&lt;{ format: string; metadata: any; structure: { notes: string[]; slides: { index: number; part: string; texts: any[]; }[]; text: string; }; }&gt;</code>
Extracts text and structure from an uploaded .pptx.

**Kind**: instance method of [<code>PptxService</code>](#PptxService)  
**Returns**: <code>Promise&lt;{ format: string; metadata: any; structure: { notes: string[]; slides: { index: number; part: string; texts: any[]; }[]; text: string; }; }&gt;</code> - The parsed metadata, slide texts, notes and full body text.  
src: packages/backend/src/resources/pptx/pptx.service.ts:286  
dist: packages/backend/dist/resources/pptx/pptx.service.js:234
<a name="PptxService+metadata"></a>

### pptxService.metadata() ⇒ <code>Promise&lt;any&gt;</code>
Normalized OOXML metadata for an uploaded .pptx.

**Kind**: instance method of [<code>PptxService</code>](#PptxService)  
**Returns**: <code>Promise&lt;any&gt;</code> - Format plus the parsed properties.  
src: packages/backend/src/resources/pptx/pptx.service.ts:307  
dist: packages/backend/dist/resources/pptx/pptx.service.js:250
<a name="readPartsCapped"></a>

## readPartsCapped(buffer, limits) ⇒
Maps the shared OOXML reader's cap violations to HTTP errors (413 for size, 400 otherwise).

**Kind**: global function  
**Returns**: The extracted package parts.  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>Buffer&lt;ArrayBufferLike&gt;</code> | The buffered upload. |
| limits |  | Optional per-call cap overrides. |

src: packages/backend/src/resources/pptx/pptx.service.ts:30  
dist: packages/backend/dist/resources/pptx/pptx.service.js:25
<a name="assertHyperlinkScheme"></a>

## assertHyperlinkScheme(record)
Validates the run-level hyperlink allowlist.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| record | <code>Record&lt;string, unknown&gt;</code> | The inspected dictionary; hyperlink lives at `record.hyperlink.url`. |

src: packages/backend/src/resources/pptx/pptx.service.ts:49  
dist: packages/backend/dist/resources/pptx/pptx.service.js:38
<a name="assertBuildPayload"></a>

## assertBuildPayload(body)
Rejects payloads whose serialized size or element count could exhaust memory.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| body | <code>{ layout: &quot;LAYOUT\_16x9&quot; \| &quot;LAYOUT\_16x10&quot; \| &quot;LAYOUT\_4x3&quot; \| &quot;LAYOUT\_WIDE&quot;; slides: { elements: ({ h: number; w: number; x: number; y: number; chartType: &quot;line&quot; \| &quot;bar&quot; \| &quot;pie&quot; \| &quot;bar3d&quot; \| &quot;doughnut&quot; \| &quot;area&quot; \| &quot;scatter&quot; \| &quot;radar&quot;; series: { labels: string[]; values: number[]; name?: string; }[]; type: &quot;chart&quot;; chartColors?: any[]; showLegend?: boolean; showValue?: boolean; title?: string; } \| { h: number; w: number; x: number; y: number; runs: { [x: string]: any; text: string; bold?: boolean; breakLine?: boolean; bullet?: boolean \| { code?: string; }; fontFace?: string; fontSize?: number; hyperlink?: { slide?: number; url?: string; }; indentLevel?: number; italic?: boolean; lang?: string; strike?: boolean; subScript?: boolean; superScript?: boolean; underline?: boolean; }[]; type: &quot;text&quot;; align?: &quot;left&quot; \| &quot;center&quot; \| &quot;right&quot; \| &quot;justify&quot;; bullet?: boolean \| { code?: string; }; fill?: { [x: string]: any; }; fit?: &quot;none&quot; \| &quot;resize&quot; \| &quot;shrink&quot;; indentLevel?: number; line?: { [x: string]: any; width?: number; }; lineSpacing?: number; margin?: number; rotation?: number; rtl?: boolean; valign?: &quot;bottom&quot; \| &quot;top&quot; \| &quot;middle&quot;; } \| { h: number; w: number; x: number; y: number; shape: &quot;wave&quot; \| &quot;diagStripe&quot; \| &quot;line&quot; \| &quot;doubleWave&quot; \| &quot;frame&quot; \| &quot;rect&quot; \| &quot;ellipse&quot; \| &quot;accentBorderCallout1&quot; \| &quot;accentBorderCallout2&quot; \| &quot;accentBorderCallout3&quot; \| &quot;accentCallout1&quot; \| &quot;accentCallout2&quot; \| &quot;accentCallout3&quot; \| &quot;actionButtonBackPrevious&quot; \| &quot;actionButtonBeginning&quot; \| &quot;actionButtonBlank&quot; \| &quot;actionButtonDocument&quot; \| &quot;actionButtonEnd&quot; \| &quot;actionButtonForwardNext&quot; \| &quot;actionButtonHelp&quot; \| &quot;actionButtonHome&quot; \| &quot;actionButtonInformation&quot; \| &quot;actionButtonMovie&quot; \| &quot;actionButtonReturn&quot; \| &quot;actionButtonSound&quot; \| &quot;arc&quot; \| &quot;bentArrow&quot; \| &quot;bentUpArrow&quot; \| &quot;bevel&quot; \| &quot;blockArc&quot; \| &quot;borderCallout1&quot; \| &quot;borderCallout2&quot; \| &quot;borderCallout3&quot; \| &quot;bracePair&quot; \| &quot;bracketPair&quot; \| &quot;callout1&quot; \| &quot;callout2&quot; \| &quot;callout3&quot; \| &quot;can&quot; \| &quot;chartPlus&quot; \| &quot;chartStar&quot; \| &quot;chartX&quot; \| &quot;chevron&quot; \| &quot;chord&quot; \| &quot;circularArrow&quot; \| &quot;cloud&quot; \| &quot;cloudCallout&quot; \| &quot;corner&quot; \| &quot;cornerTabs&quot; \| &quot;cube&quot; \| &quot;curvedDownArrow&quot; \| &quot;curvedLeftArrow&quot; \| &quot;curvedRightArrow&quot; \| &quot;curvedUpArrow&quot; \| &quot;custGeom&quot; \| &quot;decagon&quot; \| &quot;diamond&quot; \| &quot;dodecagon&quot; \| &quot;donut&quot; \| &quot;downArrow&quot; \| &quot;downArrowCallout&quot; \| &quot;ellipseRibbon&quot; \| &quot;ellipseRibbon2&quot; \| &quot;flowChartAlternateProcess&quot; \| &quot;flowChartCollate&quot; \| &quot;flowChartConnector&quot; \| &quot;flowChartDecision&quot; \| &quot;flowChartDelay&quot; \| &quot;flowChartDisplay&quot; \| &quot;flowChartDocument&quot; \| &quot;flowChartExtract&quot; \| &quot;flowChartInputOutput&quot; \| &quot;flowChartInternalStorage&quot; \| &quot;flowChartMagneticDisk&quot; \| &quot;flowChartMagneticDrum&quot; \| &quot;flowChartMagneticTape&quot; \| &quot;flowChartManualInput&quot; \| &quot;flowChartManualOperation&quot; \| &quot;flowChartMerge&quot; \| &quot;flowChartMultidocument&quot; \| &quot;flowChartOfflineStorage&quot; \| &quot;flowChartOffpageConnector&quot; \| &quot;flowChartOnlineStorage&quot; \| &quot;flowChartOr&quot; \| &quot;flowChartPredefinedProcess&quot; \| &quot;flowChartPreparation&quot; \| &quot;flowChartProcess&quot; \| &quot;flowChartPunchedCard&quot; \| &quot;flowChartPunchedTape&quot; \| &quot;flowChartSort&quot; \| &quot;flowChartSummingJunction&quot; \| &quot;flowChartTerminator&quot; \| &quot;folderCorner&quot; \| &quot;funnel&quot; \| &quot;gear6&quot; \| &quot;gear9&quot; \| &quot;halfFrame&quot; \| &quot;heart&quot; \| &quot;heptagon&quot; \| &quot;hexagon&quot; \| &quot;homePlate&quot; \| &quot;horizontalScroll&quot; \| &quot;irregularSeal1&quot; \| &quot;irregularSeal2&quot; \| &quot;leftArrow&quot; \| &quot;leftArrowCallout&quot; \| &quot;leftBrace&quot; \| &quot;leftBracket&quot; \| &quot;leftCircularArrow&quot; \| &quot;leftRightArrow&quot; \| &quot;leftRightArrowCallout&quot; \| &quot;leftRightCircularArrow&quot; \| &quot;leftRightRibbon&quot; \| &quot;leftRightUpArrow&quot; \| &quot;leftUpArrow&quot; \| &quot;lightningBolt&quot; \| &quot;lineInv&quot; \| &quot;mathDivide&quot; \| &quot;mathEqual&quot; \| &quot;mathMinus&quot; \| &quot;mathMultiply&quot; \| &quot;mathNotEqual&quot; \| &quot;mathPlus&quot; \| &quot;moon&quot; \| &quot;noSmoking&quot; \| &quot;nonIsoscelesTrapezoid&quot; \| &quot;notchedRightArrow&quot; \| &quot;octagon&quot; \| &quot;parallelogram&quot; \| &quot;pentagon&quot; \| &quot;pie&quot; \| &quot;pieWedge&quot; \| &quot;plaque&quot; \| &quot;plaqueTabs&quot; \| &quot;plus&quot; \| &quot;quadArrow&quot; \| &quot;quadArrowCallout&quot; \| &quot;ribbon&quot; \| &quot;ribbon2&quot; \| &quot;rightArrow&quot; \| &quot;rightArrowCallout&quot; \| &quot;rightBrace&quot; \| &quot;rightBracket&quot; \| &quot;round1Rect&quot; \| &quot;round2DiagRect&quot; \| &quot;round2SameRect&quot; \| &quot;roundRect&quot; \| &quot;rtTriangle&quot; \| &quot;smileyFace&quot; \| &quot;snip1Rect&quot; \| &quot;snip2DiagRect&quot; \| &quot;snip2SameRect&quot; \| &quot;snipRoundRect&quot; \| &quot;squareTabs&quot; \| &quot;star10&quot; \| &quot;star12&quot; \| &quot;star16&quot; \| &quot;star24&quot; \| &quot;star32&quot; \| &quot;star4&quot; \| &quot;star5&quot; \| &quot;star6&quot; \| &quot;star7&quot; \| &quot;star8&quot; \| &quot;stripedRightArrow&quot; \| &quot;sun&quot; \| &quot;swooshArrow&quot; \| &quot;teardrop&quot; \| &quot;trapezoid&quot; \| &quot;triangle&quot; \| &quot;upArrow&quot; \| &quot;upArrowCallout&quot; \| &quot;upDownArrow&quot; \| &quot;upDownArrowCallout&quot; \| &quot;uturnArrow&quot; \| &quot;verticalScroll&quot; \| &quot;wedgeEllipseCallout&quot; \| &quot;wedgeRectCallout&quot; \| &quot;wedgeRoundRectCallout&quot;; type: &quot;shape&quot;; fill?: { [x: string]: any; }; line?: { [x: string]: any; width?: number; }; rotation?: number; text?: { [x: string]: any; text: string; bold?: boolean; breakLine?: boolean; bullet?: boolean \| { code?: string; }; fontFace?: string; fontSize?: number; hyperlink?: { slide?: number; url?: string; }; indentLevel?: number; italic?: boolean; lang?: string; strike?: boolean; subScript?: boolean; superScript?: boolean; underline?: boolean; }[]; } \| { h: number; w: number; x: number; y: number; rows: { text: string; colSpan?: number; fill?: { [x: string]: any; }; options?: { colspan?: number; fill?: { [x: string]: any; }; margin?: number; rowspan?: number; valign?: &quot;bottom&quot; \| &quot;top&quot; \| &quot;middle&quot;; }; rowSpan?: number; }[][]; type: &quot;table&quot;; margin?: number; } \| { h: number; w: number; x: number; y: number; data: string; imageType: &quot;png&quot; \| &quot;jpg&quot; \| &quot;gif&quot; \| &quot;bmp&quot;; type: &quot;image&quot;; altText?: string; sizing?: { h: number; type: &quot;contain&quot; \| &quot;cover&quot; \| &quot;crop&quot;; w: number; }; transparency?: number; })[]; background?: { [x: string]: any; }; notes?: string; }[]; metadata?: { author?: string; company?: string; revision?: string; subject?: string; title?: string; }; theme?: { bodyFontFace?: string; headFontFace?: string; }; }</code> | The validated build payload. |

src: packages/backend/src/resources/pptx/pptx.service.ts:67  
dist: packages/backend/dist/resources/pptx/pptx.service.js:52
<a name="readBody"></a>

## readBody(cls) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>
Opens the uploaded body, bounded by the scanner cap.

**Kind**: global function  
**Returns**: <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code> - The body bytes, capped.  

| Param | Type | Description |
| --- | --- | --- |
| cls | <code>NormalizedClsService</code> | Normalized request context. |

src: packages/backend/src/resources/pptx/pptx.service.ts:132  
dist: packages/backend/dist/resources/pptx/pptx.service.js:114
<a name="assertPptxSignature"></a>

## assertPptxSignature(buffer) ⇒ <code>Promise&lt;void&gt;</code>
Signature must be the plain pptx mime; closes the renamed-image and .potm/.pptm holes.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>Buffer&lt;ArrayBufferLike&gt;</code> | The buffered upload. |

src: packages/backend/src/resources/pptx/pptx.service.ts:150  
dist: packages/backend/dist/resources/pptx/pptx.service.js:127
<a name="extractPptx"></a>

## extractPptx(parts) ⇒ <code>{ slides: { index: number; part: string; texts: any[]; }[]; }</code>
Extracts every slide's shape text, in presentation order.

**Kind**: global function  
**Returns**: <code>{ slides: { index: number; part: string; texts: any[]; }[]; }</code> - The per-slide text blocks.  

| Param | Type | Description |
| --- | --- | --- |
| parts | <code>Map&lt;string, Buffer&lt;ArrayBufferLike&gt;&gt;</code> | The validated OOXML parts. |

src: packages/backend/src/resources/pptx/pptx.service.ts:196  
dist: packages/backend/dist/resources/pptx/pptx.service.js:164
<a name="collectNotes"></a>

## collectNotes(parts) ⇒ <code>string[]</code>
Notes text per notes slide, sorted by the numeric suffix. The slide-number
placeholder shape (`ph type="sldNum"`) is excluded, so cached slide numbers
do not leak into the notes.

**Kind**: global function  
**Returns**: <code>string[]</code> - The non-empty notes-slide texts, in slide order when filenames are numbered.  

| Param | Type | Description |
| --- | --- | --- |
| parts | <code>Map&lt;string, Buffer&lt;ArrayBufferLike&gt;&gt;</code> | The validated OOXML parts. |

src: packages/backend/src/resources/pptx/pptx.service.ts:225  
dist: packages/backend/dist/resources/pptx/pptx.service.js:183
