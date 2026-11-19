## Functions

<dl>
<dt><a href="#parseBitrate">parseBitrate(value)</a> ⇒ <code>number</code></dt>
<dd><p>Parses a video bitrate literal (<code>1200k</code>, <code>5M</code>) into bits per second.</p>
</dd>
<dt><a href="#videoEncoderConstant">videoEncoderConstant(codec)</a> ⇒ <code>import(&quot;node-av&quot;).FFVideoEncoder&lt;&quot;libvpx-vp9&quot;&gt; | import(&quot;node-av&quot;).FFVideoEncoder&lt;&quot;libaom-av1&quot;&gt; | import(&quot;node-av&quot;).FFVideoEncoder&lt;&quot;libx264&quot;&gt;</code></dt>
<dd><p>Maps the public codec name to the node-av FFmpeg encoder constant.</p>
</dd>
</dl>

<a name="parseBitrate"></a>

## parseBitrate(value) ⇒ <code>number</code>
Parses a video bitrate literal (`1200k`, `5M`) into bits per second.

**Kind**: global function  
**Returns**: <code>number</code> - The bitrate in bits per second, defaulting to 2 000 000 when unparsable.  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> | The bitrate literal from the query (e.g. '2500k'). |

src: packages/backend/src/resources/video/worker/codecs.ts:14  
dist: packages/backend/dist/resources/video/worker/codecs.js:2
<a name="videoEncoderConstant"></a>

## videoEncoderConstant(codec) ⇒ <code>import(&quot;node-av&quot;).FFVideoEncoder&lt;&quot;libvpx-vp9&quot;&gt; \| import(&quot;node-av&quot;).FFVideoEncoder&lt;&quot;libaom-av1&quot;&gt; \| import(&quot;node-av&quot;).FFVideoEncoder&lt;&quot;libx264&quot;&gt;</code>
Maps the public codec name to the node-av FFmpeg encoder constant.

**Kind**: global function  
**Returns**: <code>import(&quot;node-av&quot;).FFVideoEncoder&lt;&quot;libvpx-vp9&quot;&gt; \| import(&quot;node-av&quot;).FFVideoEncoder&lt;&quot;libaom-av1&quot;&gt; \| import(&quot;node-av&quot;).FFVideoEncoder&lt;&quot;libx264&quot;&gt;</code> - The FFmpeg encoder constant for passing to the output stream.  

| Param | Description |
| --- | --- |
| codec | The codec from the query (`vp9` | `av1` | `x264`-family). |

src: packages/backend/src/resources/video/worker/codecs.ts:27  
dist: packages/backend/dist/resources/video/worker/codecs.js:10
