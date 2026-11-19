<a name="parseFrames"></a>

## parseFrames(raw) ⇒ <code>number[]</code>
Parse a comma-separated list of frame timestamps into a deduplicated,
validated, sorted, and capped array of seconds.

**Kind**: global function  
**Returns**: <code>number[]</code> - Sorted unique frame timestamps in seconds.  

| Param | Type | Description |
| --- | --- | --- |
| raw | <code>string</code> | Raw comma-separated frame string. |

src: packages/backend/src/resources/video/schema.ts:52  
dist: packages/backend/dist/resources/video/schema.js:35
