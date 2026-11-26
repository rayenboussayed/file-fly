## Classes

<dl>
<dt><a href="#Discard">Discard</a></dt>
<dd><p>A Writable that discards everything written to it, used to consume an image
stream while sharp gathers metadata/stats (so the image bytes never reach stdout).</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#metadata">metadata()</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Reads image metadata from stdin via sharp and writes it as JSON to stdout.</p>
</dd>
<dt><a href="#stats">stats()</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Reads image statistics from stdin via sharp and writes them as JSON to stdout.</p>
</dd>
</dl>

<a name="Discard"></a>

## Discard
A Writable that discards everything written to it, used to consume an image
stream while sharp gathers metadata/stats (so the image bytes never reach stdout).

**Kind**: global class  
src: packages/backend/src/resources/image/worker/inspect.ts:9  
dist: packages/backend/dist/resources/image/worker/inspect.js:4
<a name="metadata"></a>

## metadata() ⇒ <code>Promise&lt;void&gt;</code>
Reads image metadata from stdin via sharp and writes it as JSON to stdout.

**Kind**: global function  
src: packages/backend/src/resources/image/worker/inspect.ts:18  
dist: packages/backend/dist/resources/image/worker/inspect.js:9
<a name="stats"></a>

## stats() ⇒ <code>Promise&lt;void&gt;</code>
Reads image statistics from stdin via sharp and writes them as JSON to stdout.

**Kind**: global function  
src: packages/backend/src/resources/image/worker/inspect.ts:33  
dist: packages/backend/dist/resources/image/worker/inspect.js:18
