## Functions

<dl>
<dt><a href="#metadata">metadata(inputData)</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Opens the audio input with node-av and writes its container/stream metadata as JSON to stdout.</p>
<p>// eslint-disable-next-line jsdoc/require-param-description</p>
</dd>
<dt><a href="#stats">stats(inputData)</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Opens the audio input with node-av and writes its stream statistics (bitrate, channels, sample rate, codec) as JSON to stdout.</p>
<p>// eslint-disable-next-line jsdoc/require-param-description</p>
</dd>
</dl>

<a name="metadata"></a>

## metadata(inputData) ⇒ <code>Promise&lt;void&gt;</code>
Opens the audio input with node-av and writes its container/stream metadata as JSON to stdout.

// eslint-disable-next-line jsdoc/require-param-description

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| inputData | <code>AudioWorkerData</code> | Description. |

src: packages/backend/src/resources/audio/worker/inspect.ts:16  
dist: packages/backend/dist/resources/audio/worker/inspect.js:5
<a name="stats"></a>

## stats(inputData) ⇒ <code>Promise&lt;void&gt;</code>
Opens the audio input with node-av and writes its stream statistics (bitrate, channels, sample rate, codec) as JSON to stdout.

// eslint-disable-next-line jsdoc/require-param-description

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| inputData | <code>AudioWorkerData</code> | Description. |

src: packages/backend/src/resources/audio/worker/inspect.ts:46  
dist: packages/backend/dist/resources/audio/worker/inspect.js:26
