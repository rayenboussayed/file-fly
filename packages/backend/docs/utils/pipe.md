<a name="pipeToReply"></a>

## pipeToReply(source, response, outMeter) ⇒ <code>Promise&lt;void&gt;</code>
Streams a processed media stream into the raw HTTP response.

Once headers are sent there is nothing left to report to the client, so
errors (worker failure, client disconnect) are logged and the raw response
is destroyed instead of being rethrown into the exception filter.

Unlike `pipeline()`, a destination failure does NOT destroy `source`: the
remainder is drained to EOF instead. A destroyed branch would stall the
sibling branch of the `jutilities` tee that feeds the cache writer, so the
worker output would never be persisted on early client disconnects.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| source | <code>Readable</code> | Stream produced by a worker or served from the cache. |
| response | <code>FastifyReply&lt;import(&quot;fastify&quot;).RouteGenericInterface, import(&quot;fastify&quot;).RawServerDefault, import(&quot;http&quot;).IncomingMessage, import(&quot;http&quot;).ServerResponse&lt;import(&quot;http&quot;).IncomingMessage&gt;, unknown, import(&quot;fastify&quot;).FastifySchema, import(&quot;fastify&quot;).FastifyTypeProviderDefault, unknown&gt;</code> | Fastify reply wrapping the raw HTTP response. |
| outMeter | <code>Transform</code> | Optional pass-through transform placed between the source and the raw response to count streamed bytes (see `createOutMeter`). |

src: packages/backend/src/utils/pipe.ts:27  
dist: packages/backend/dist/utils/pipe.js:4
