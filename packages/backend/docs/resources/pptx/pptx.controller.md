<a name="PptxController"></a>

## PptxController
PPTX routes. `/pptx/build` consumes JSON and bypasses the media
interceptors by design (JSON bodies are never virus-scanned or signature-probed);
`/pptx/extract` and `/pptx/metadata` take the binary upload and are ClamAV-scanned.

**Kind**: global variable  
src: packages/backend/src/resources/pptx/pptx.controller.ts:29  
dist: packages/backend/dist/resources/pptx/pptx.controller.js:21

* [PptxController](#PptxController)
    * [.build(response, body)](#PptxController+build) ⇒ <code>Promise&lt;void&gt;</code>
    * [.extract(_query)](#PptxController+extract) ⇒ <code>Promise&lt;{ format: string; metadata: any; structure: { notes: string[]; slides: { index: number; part: string; texts: any[]; }[]; text: string; }; }&gt;</code>
    * [.metadata(_query)](#PptxController+metadata) ⇒ <code>Promise&lt;any&gt;</code>

<a name="PptxController+build"></a>

### pptxController.build(response, body) ⇒ <code>Promise&lt;void&gt;</code>
Builds a .pptx from the JSON payload (201).

**Kind**: instance method of [<code>PptxController</code>](#PptxController)  
**Returns**: <code>Promise&lt;void&gt;</code> - The document bytes (201).  

| Param | Type | Description |
| --- | --- | --- |
| response | <code>FastifyReply&lt;import(&quot;fastify&quot;).RouteGenericInterface, import(&quot;fastify&quot;).RawServerDefault, import(&quot;http&quot;).IncomingMessage, import(&quot;http&quot;).ServerResponse&lt;import(&quot;http&quot;).IncomingMessage&gt;, unknown, import(&quot;fastify&quot;).FastifySchema, import(&quot;fastify&quot;).FastifyTypeProviderDefault, unknown&gt;</code> | Raw reply, streamed as .pptx. |
| body | <code>{ layout: &quot;LAYOUT\_16x9&quot; \| &quot;LAYOUT\_16x10&quot; \| &quot;LAYOUT\_4x3&quot; \| &quot;LAYOUT\_WIDE&quot;; slides: { elements: ({ h: number; w: number; x: number; y: number; chartType: &quot;line&quot; \| &quot;bar&quot; \| &quot;pie&quot; \| &quot;bar3d&quot; \| &quot;doughnut&quot; \| &quot;area&quot; \| &quot;scatter&quot; \| &quot;radar&quot;; series: { labels: string[]; values: number[]; name?: string; }[]; type: &quot;chart&quot;; chartColors?: any[]; showLegend?: boolean; showValue?: boolean; title?: string; } \| { h: number; w: number; x: number; y: number; runs: { [x: string]: any; text: string; bold?: boolean; breakLine?: boolean; bullet?: boolean \| { code?: string; }; fontFace?: string; fontSize?: number; hyperlink?: { slide?: number; url?: string; }; indentLevel?: number; italic?: boolean; lang?: string; strike?: boolean; subScript?: boolean; superScript?: boolean; underline?: boolean; }[]; type: &quot;text&quot;; align?: &quot;left&quot; \| &quot;center&quot; \| &quot;right&quot; \| &quot;justify&quot;; bullet?: boolean \| { code?: string; }; fill?: { [x: string]: any; }; fit?: &quot;none&quot; \| &quot;resize&quot; \| &quot;shrink&quot;; indentLevel?: number; line?: { [x: string]: any; width?: number; }; lineSpacing?: number; margin?: number; rotation?: number; rtl?: boolean; valign?: &quot;bottom&quot; \| &quot;top&quot; \| &quot;middle&quot;; } \| { h: number; w: number; x: number; y: number; shape: &quot;wave&quot; \| &quot;diagStripe&quot; \| &quot;line&quot; \| &quot;doubleWave&quot; \| &quot;frame&quot; \| &quot;rect&quot; \| &quot;ellipse&quot; \| &quot;accentBorderCallout1&quot; \| &quot;accentBorderCallout2&quot; \| &quot;accentBorderCallout3&quot; \| &quot;accentCallout1&quot; \| &quot;accentCallout2&quot; \| &quot;accentCallout3&quot; \| &quot;actionButtonBackPrevious&quot; \| &quot;actionButtonBeginning&quot; \| &quot;actionButtonBlank&quot; \| &quot;actionButtonDocument&quot; \| &quot;actionButtonEnd&quot; \| &quot;actionButtonForwardNext&quot; \| &quot;actionButtonHelp&quot; \| &quot;actionButtonHome&quot; \| &quot;actionButtonInformation&quot; \| &quot;actionButtonMovie&quot; \| &quot;actionButtonReturn&quot; \| &quot;actionButtonSound&quot; \| &quot;arc&quot; \| &quot;bentArrow&quot; \| &quot;bentUpArrow&quot; \| &quot;bevel&quot; \| &quot;blockArc&quot; \| &quot;borderCallout1&quot; \| &quot;borderCallout2&quot; \| &quot;borderCallout3&quot; \| &quot;bracePair&quot; \| &quot;bracketPair&quot; \| &quot;callout1&quot; \| &quot;callout2&quot; \| &quot;callout3&quot; \| &quot;can&quot; \| &quot;chartPlus&quot; \| &quot;chartStar&quot; \| &quot;chartX&quot; \| &quot;chevron&quot; \| &quot;chord&quot; \| &quot;circularArrow&quot; \| &quot;cloud&quot; \| &quot;cloudCallout&quot; \| &quot;corner&quot; \| &quot;cornerTabs&quot; \| &quot;cube&quot; \| &quot;curvedDownArrow&quot; \| &quot;curvedLeftArrow&quot; \| &quot;curvedRightArrow&quot; \| &quot;curvedUpArrow&quot; \| &quot;custGeom&quot; \| &quot;decagon&quot; \| &quot;diamond&quot; \| &quot;dodecagon&quot; \| &quot;donut&quot; \| &quot;downArrow&quot; \| &quot;downArrowCallout&quot; \| &quot;ellipseRibbon&quot; \| &quot;ellipseRibbon2&quot; \| &quot;flowChartAlternateProcess&quot; \| &quot;flowChartCollate&quot; \| &quot;flowChartConnector&quot; \| &quot;flowChartDecision&quot; \| &quot;flowChartDelay&quot; \| &quot;flowChartDisplay&quot; \| &quot;flowChartDocument&quot; \| &quot;flowChartExtract&quot; \| &quot;flowChartInputOutput&quot; \| &quot;flowChartInternalStorage&quot; \| &quot;flowChartMagneticDisk&quot; \| &quot;flowChartMagneticDrum&quot; \| &quot;flowChartMagneticTape&quot; \| &quot;flowChartManualInput&quot; \| &quot;flowChartManualOperation&quot; \| &quot;flowChartMerge&quot; \| &quot;flowChartMultidocument&quot; \| &quot;flowChartOfflineStorage&quot; \| &quot;flowChartOffpageConnector&quot; \| &quot;flowChartOnlineStorage&quot; \| &quot;flowChartOr&quot; \| &quot;flowChartPredefinedProcess&quot; \| &quot;flowChartPreparation&quot; \| &quot;flowChartProcess&quot; \| &quot;flowChartPunchedCard&quot; \| &quot;flowChartPunchedTape&quot; \| &quot;flowChartSort&quot; \| &quot;flowChartSummingJunction&quot; \| &quot;flowChartTerminator&quot; \| &quot;folderCorner&quot; \| &quot;funnel&quot; \| &quot;gear6&quot; \| &quot;gear9&quot; \| &quot;halfFrame&quot; \| &quot;heart&quot; \| &quot;heptagon&quot; \| &quot;hexagon&quot; \| &quot;homePlate&quot; \| &quot;horizontalScroll&quot; \| &quot;irregularSeal1&quot; \| &quot;irregularSeal2&quot; \| &quot;leftArrow&quot; \| &quot;leftArrowCallout&quot; \| &quot;leftBrace&quot; \| &quot;leftBracket&quot; \| &quot;leftCircularArrow&quot; \| &quot;leftRightArrow&quot; \| &quot;leftRightArrowCallout&quot; \| &quot;leftRightCircularArrow&quot; \| &quot;leftRightRibbon&quot; \| &quot;leftRightUpArrow&quot; \| &quot;leftUpArrow&quot; \| &quot;lightningBolt&quot; \| &quot;lineInv&quot; \| &quot;mathDivide&quot; \| &quot;mathEqual&quot; \| &quot;mathMinus&quot; \| &quot;mathMultiply&quot; \| &quot;mathNotEqual&quot; \| &quot;mathPlus&quot; \| &quot;moon&quot; \| &quot;noSmoking&quot; \| &quot;nonIsoscelesTrapezoid&quot; \| &quot;notchedRightArrow&quot; \| &quot;octagon&quot; \| &quot;parallelogram&quot; \| &quot;pentagon&quot; \| &quot;pie&quot; \| &quot;pieWedge&quot; \| &quot;plaque&quot; \| &quot;plaqueTabs&quot; \| &quot;plus&quot; \| &quot;quadArrow&quot; \| &quot;quadArrowCallout&quot; \| &quot;ribbon&quot; \| &quot;ribbon2&quot; \| &quot;rightArrow&quot; \| &quot;rightArrowCallout&quot; \| &quot;rightBrace&quot; \| &quot;rightBracket&quot; \| &quot;round1Rect&quot; \| &quot;round2DiagRect&quot; \| &quot;round2SameRect&quot; \| &quot;roundRect&quot; \| &quot;rtTriangle&quot; \| &quot;smileyFace&quot; \| &quot;snip1Rect&quot; \| &quot;snip2DiagRect&quot; \| &quot;snip2SameRect&quot; \| &quot;snipRoundRect&quot; \| &quot;squareTabs&quot; \| &quot;star10&quot; \| &quot;star12&quot; \| &quot;star16&quot; \| &quot;star24&quot; \| &quot;star32&quot; \| &quot;star4&quot; \| &quot;star5&quot; \| &quot;star6&quot; \| &quot;star7&quot; \| &quot;star8&quot; \| &quot;stripedRightArrow&quot; \| &quot;sun&quot; \| &quot;swooshArrow&quot; \| &quot;teardrop&quot; \| &quot;trapezoid&quot; \| &quot;triangle&quot; \| &quot;upArrow&quot; \| &quot;upArrowCallout&quot; \| &quot;upDownArrow&quot; \| &quot;upDownArrowCallout&quot; \| &quot;uturnArrow&quot; \| &quot;verticalScroll&quot; \| &quot;wedgeEllipseCallout&quot; \| &quot;wedgeRectCallout&quot; \| &quot;wedgeRoundRectCallout&quot;; type: &quot;shape&quot;; fill?: { [x: string]: any; }; line?: { [x: string]: any; width?: number; }; rotation?: number; text?: { [x: string]: any; text: string; bold?: boolean; breakLine?: boolean; bullet?: boolean \| { code?: string; }; fontFace?: string; fontSize?: number; hyperlink?: { slide?: number; url?: string; }; indentLevel?: number; italic?: boolean; lang?: string; strike?: boolean; subScript?: boolean; superScript?: boolean; underline?: boolean; }[]; } \| { h: number; w: number; x: number; y: number; rows: { text: string; colSpan?: number; fill?: { [x: string]: any; }; options?: { colspan?: number; fill?: { [x: string]: any; }; margin?: number; rowspan?: number; valign?: &quot;bottom&quot; \| &quot;top&quot; \| &quot;middle&quot;; }; rowSpan?: number; }[][]; type: &quot;table&quot;; margin?: number; } \| { h: number; w: number; x: number; y: number; data: string; imageType: &quot;png&quot; \| &quot;jpg&quot; \| &quot;gif&quot; \| &quot;bmp&quot;; type: &quot;image&quot;; altText?: string; sizing?: { h: number; type: &quot;contain&quot; \| &quot;cover&quot; \| &quot;crop&quot;; w: number; }; transparency?: number; })[]; background?: { [x: string]: any; }; notes?: string; }[]; metadata?: { author?: string; company?: string; revision?: string; subject?: string; title?: string; }; theme?: { bodyFontFace?: string; headFontFace?: string; }; }</code> | Slides, elements, theme and metadata. |

src: packages/backend/src/resources/pptx/pptx.controller.ts:42  
dist: packages/backend/dist/resources/pptx/pptx.controller.js:28
<a name="PptxController+extract"></a>

### pptxController.extract(_query) ⇒ <code>Promise&lt;{ format: string; metadata: any; structure: { notes: string[]; slides: { index: number; part: string; texts: any[]; }[]; text: string; }; }&gt;</code>
Extracts text and structure from an uploaded .pptx (201).

**Kind**: instance method of [<code>PptxController</code>](#PptxController)  
**Returns**: <code>Promise&lt;{ format: string; metadata: any; structure: { notes: string[]; slides: { index: number; part: string; texts: any[]; }[]; text: string; }; }&gt;</code> - The extracted metadata, slide texts and notes.  

| Param | Type | Description |
| --- | --- | --- |
| _query | <code>unknown</code> | Empty query object; junk parameters are rejected with 400. |

src: packages/backend/src/resources/pptx/pptx.controller.ts:61  
dist: packages/backend/dist/resources/pptx/pptx.controller.js:34
<a name="PptxController+metadata"></a>

### pptxController.metadata(_query) ⇒ <code>Promise&lt;any&gt;</code>
Normalized OOXML metadata for an uploaded .pptx (201).

**Kind**: instance method of [<code>PptxController</code>](#PptxController)  
**Returns**: <code>Promise&lt;any&gt;</code> - The metadata document.  

| Param | Type | Description |
| --- | --- | --- |
| _query | <code>unknown</code> | Empty query object; junk parameters are rejected with 400. |

src: packages/backend/src/resources/pptx/pptx.controller.ts:74  
dist: packages/backend/dist/resources/pptx/pptx.controller.js:37
