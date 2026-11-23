## Functions

<dl>
<dt><a href="#metadata">metadata()</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Opens the video input with node-av and writes its container/stream metadata (including dimensions) as JSON to stdout.</p>
</dd>
<dt><a href="#stats">stats()</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Opens the video input with node-av and writes its stream statistics (bitrate, dimensions, codec) as JSON to stdout.</p>
</dd>
</dl>

<a name="metadata"></a>

## metadata() ⇒ <code>Promise&lt;void&gt;</code>
Opens the video input with node-av and writes its container/stream metadata (including dimensions) as JSON to stdout.

**Kind**: global function  
src: packages/backend/src/resources/video/worker/inspect.ts:13  
dist: packages/backend/dist/resources/video/worker/inspect.js:5
<a name="stats"></a>

## stats() ⇒ <code>Promise&lt;void&gt;</code>
Opens the video input with node-av and writes its stream statistics (bitrate, dimensions, codec) as JSON to stdout.

**Kind**: global function  
src: packages/backend/src/resources/video/worker/inspect.ts:42  
dist: packages/backend/dist/resources/video/worker/inspect.js:28
