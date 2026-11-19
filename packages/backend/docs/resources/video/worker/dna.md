<a name="dna"></a>

## dna() ⇒ <code>Promise&lt;void&gt;</code>
Computes a sequence of PDQ perceptual hashes for the video on stdin,
sampled at 2 fps and normalized to 512px-wide RGB frames.

The decoder runs to EOF so stdin is usually fully consumed, but the
remainder is still drained in the `finally` block: on early failure
(e.g. no video stream) the unread HTTP upload must be discarded or
the client stalls mid-send.

**Kind**: global function  
**Returns**: <code>Promise&lt;void&gt;</code> - Resolves after the DNA JSON line is written to stdout.  
src: packages/backend/src/resources/video/worker/dna.ts:23  
dist: packages/backend/dist/resources/video/worker/dna.js:60
