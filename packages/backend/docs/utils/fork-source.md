<a name="forkSource"></a>

## forkSource(cls) ⇒ <code>Readable</code>
Splits the current source stream into two branches: returns one branch and
keeps the other as the source on the CLS store.

**Kind**: global function  
**Returns**: <code>Readable</code> - One branch of the teed source stream.  

| Param | Type | Description |
| --- | --- | --- |
| cls | <code>NormalizedClsService</code> | The normalized CLS service carrying the current request context. |

src: packages/backend/src/utils/fork-source.ts:13  
dist: packages/backend/dist/utils/fork-source.js:2
