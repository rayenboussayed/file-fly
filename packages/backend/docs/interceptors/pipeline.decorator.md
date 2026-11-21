## Functions

<dl>
<dt><a href="#UseMediaPipeline">UseMediaPipeline(signature)</a> ⇒ <code>MethodDecorator &amp; ClassDecorator</code></dt>
<dd><p>Applies the scan and parse gates used by media routes, with an optional
signature gate that enforces the accepted input formats.</p>
</dd>
<dt><a href="#UseScanPipeline">UseScanPipeline()</a> ⇒ <code>MethodDecorator &amp; ClassDecorator</code></dt>
<dd><p>Applies the scan gate used by document routes, which carry a JSON body and
need no signature probe.</p>
</dd>
</dl>

<a name="UseMediaPipeline"></a>

## UseMediaPipeline(signature) ⇒ <code>MethodDecorator &amp; ClassDecorator</code>
Applies the scan and parse gates used by media routes, with an optional
signature gate that enforces the accepted input formats.

**Kind**: global function  
**Returns**: <code>MethodDecorator &amp; ClassDecorator</code> - The composed interceptor decorator.  

| Param | Type | Description |
| --- | --- | --- |
| signature | <code>Type&lt;NestInterceptor&lt;unknown, unknown&gt;&gt;</code> | Resource-specific signature interceptor, when one exists. |

src: packages/backend/src/interceptors/pipeline.decorator.ts:12  
dist: packages/backend/dist/interceptors/pipeline.decorator.js:4
<a name="UseScanPipeline"></a>

## UseScanPipeline() ⇒ <code>MethodDecorator &amp; ClassDecorator</code>
Applies the scan gate used by document routes, which carry a JSON body and
need no signature probe.

**Kind**: global function  
**Returns**: <code>MethodDecorator &amp; ClassDecorator</code> - The composed interceptor decorator.  
src: packages/backend/src/interceptors/pipeline.decorator.ts:26  
dist: packages/backend/dist/interceptors/pipeline.decorator.js:13
