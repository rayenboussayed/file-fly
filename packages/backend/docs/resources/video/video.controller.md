<a name="VideoController"></a>

## VideoController
Video routes: processor, audio extraction, metadata, DNA, stats and screenshot (binary stream endpoints).

**Kind**: global variable  
src: packages/backend/src/resources/video/video.controller.ts:37  
dist: packages/backend/dist/resources/video/video.controller.js:23
<a name="VideoController+audio"></a>

### videoController.audio(response, query) ⇒ <code>Promise&lt;void&gt;</code>
Streams the audio extracted from `/video/audio`.

**Kind**: instance method of [<code>VideoController</code>](#VideoController)  
**Returns**: <code>Promise&lt;void&gt;</code> - The piped response promise.  

| Param | Type | Description |
| --- | --- | --- |
| response | <code>FastifyReply&lt;import(&quot;fastify&quot;).RouteGenericInterface, import(&quot;fastify&quot;).RawServerDefault, import(&quot;http&quot;).IncomingMessage, import(&quot;http&quot;).ServerResponse&lt;import(&quot;http&quot;).IncomingMessage&gt;, unknown, import(&quot;fastify&quot;).FastifySchema, import(&quot;fastify&quot;).FastifyTypeProviderDefault, unknown&gt;</code> | Fastify reply whose raw headers carry the content type. |
| query |  | Validated audio options including the output format. |

src: packages/backend/src/resources/video/video.controller.ts:49  
dist: packages/backend/dist/resources/video/video.controller.js:30
