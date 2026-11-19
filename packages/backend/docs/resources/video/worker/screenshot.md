<a name="screenshot"></a>

## screenshot(frames) ⇒ <code>Promise&lt;void&gt;</code>
Extracts one JPEG frame per requested timestamp as a multipart/mixed stream.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| frames | <code>number[]</code> | Requested timestamps in seconds (sorted, deduplicated). |

src: packages/backend/src/resources/video/worker/screenshot.ts:24  
dist: packages/backend/dist/resources/video/worker/screenshot.js:65
