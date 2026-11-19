<a name="drainStream"></a>

## drainStream(stream) ⇒ <code>Promise&lt;number&gt;</code>
Discards the unread remainder of a stream without buffering it.

Callers always consume to EOF, which is why this uses an async iterator:
a `'data'` listener cannot drain streams that are paused with pending read
requests (e.g. `process.stdin` inside a worker after Demuxer reads). The
iterator's implicit `return()` destroys the stream only at EOF, after
`source` has ended — late enough that any sibling tee branch is done.

**Kind**: global function  
**Returns**: <code>Promise&lt;number&gt;</code> - The number of bytes discarded.  

| Param | Type | Description |
| --- | --- | --- |
| stream | <code>Readable</code> | Stream to drop to EOF. |

src: packages/backend/src/utils/drain.ts:16  
dist: packages/backend/dist/utils/drain.js:2
