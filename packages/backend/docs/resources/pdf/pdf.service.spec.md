## Constants

<dl>
<dt><a href="#unparseablePdf">unparseablePdf</a></dt>
<dd><p>Passes the signature gate (%PDF magic) but pdf-lib cannot parse it at all.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#handCraftedPdf">handCraftedPdf(infoObject, kids, pageCount, mediaBox)</a> ⇒ <code>Buffer&lt;ArrayBufferLike&gt;</code></dt>
<dd><p>Hand-crafts a minimal PDF with an optional /Info dict; usable where pdf-lib cannot (or chooses not to) emit one.</p>
</dd>
</dl>

<a name="unparseablePdf"></a>

## unparseablePdf
Passes the signature gate (%PDF magic) but pdf-lib cannot parse it at all.

**Kind**: global constant  
src: packages/backend/src/resources/pdf/pdf.service.spec.ts:288  
<a name="handCraftedPdf"></a>

## handCraftedPdf(infoObject, kids, pageCount, mediaBox) ⇒ <code>Buffer&lt;ArrayBufferLike&gt;</code>
Hand-crafts a minimal PDF with an optional /Info dict; usable where pdf-lib cannot (or chooses not to) emit one.

**Kind**: global function  
**Returns**: <code>Buffer&lt;ArrayBufferLike&gt;</code> - The raw bytes of the hand-crafted PDF.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| infoObject | <code>string</code> |  | The raw object body for the /Info dict (e.g. an empty-string CreationDate), or undefined for no /Info at all. |
| kids | <code>string</code> |  | The raw contents of the /Kids array of the pages object (e.g. `'3 0 R'`, or `''` for zero pages). |
| pageCount | <code>number</code> |  | The /Count value written into the pages object. |
| mediaBox | <code>string</code> | <code>&quot;[0 0 200 200]&quot;</code> | The raw MediaBox array for the single page object. |

src: packages/backend/src/resources/pdf/pdf.service.spec.ts:259  
