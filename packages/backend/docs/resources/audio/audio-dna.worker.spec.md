## Functions

<dl>
<dt><a href="#captureStdout">captureStdout()</a> ⇒ <code>Buffer&lt;ArrayBufferLike&gt;[]</code></dt>
<dd><p>Replaces process.stdout with a capturing Writable; returns collected chunks.</p>
</dd>
<dt><a href="#runDna">runDna()</a> ⇒ <code>Promise&lt;AudioDnaResult&gt;</code></dt>
<dd><p>Runs the audio DNA worker over the 6 s fixture and parses its stdout JSON line.</p>
</dd>
</dl>

<a name="captureStdout"></a>

## captureStdout() ⇒ <code>Buffer&lt;ArrayBufferLike&gt;[]</code>
Replaces process.stdout with a capturing Writable; returns collected chunks.

**Kind**: global function  
**Returns**: <code>Buffer&lt;ArrayBufferLike&gt;[]</code> - The array collecting written chunks.  
src: packages/backend/src/resources/audio/audio-dna.worker.spec.ts:22  
<a name="runDna"></a>

## runDna() ⇒ <code>Promise&lt;AudioDnaResult&gt;</code>
Runs the audio DNA worker over the 6 s fixture and parses its stdout JSON line.

**Kind**: global function  
**Returns**: <code>Promise&lt;AudioDnaResult&gt;</code> - The parsed DNA result.  
src: packages/backend/src/resources/audio/audio-dna.worker.spec.ts:39  
