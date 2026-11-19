<a name="createOutMeter"></a>

## createOutMeter(cls) ⇒ <code>import(&quot;stream&quot;).Transform</code>
Creates the pass-through meter counting streamed response bytes into CLS.

The transform forwards chunks unchanged (no copies) and stores the cumulative
byte count in CLS; the metrics interceptor reads it once the client closes.

**Kind**: global function  
**Returns**: <code>import(&quot;stream&quot;).Transform</code> - A Transform placed between the source stream and the raw response.  

| Param | Type | Description |
| --- | --- | --- |
| cls | <code>NormalizedClsService</code> | CLS service carrying the request context. |

src: packages/backend/src/metrics/out-meter.ts:13  
dist: packages/backend/dist/metrics/out-meter.js:2
