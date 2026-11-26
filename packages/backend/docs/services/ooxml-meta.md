<a name="parseOoxmlMetadata"></a>

## parseOoxmlMetadata(parts) ⇒ <code>OoxmlMetadata</code>
Extracts normalized metadata from an OOXML package.

**Kind**: global function  
**Returns**: <code>OoxmlMetadata</code> - The normalized properties; empty object when no docProps part is present.  

| Param | Type | Description |
| --- | --- | --- |
| parts | <code>Map&lt;string, Buffer&lt;ArrayBufferLike&gt;&gt;</code> | The parts returned by [OoxmlReader.readParts](OoxmlReader.readParts). |

src: packages/backend/src/services/ooxml-meta.ts:79  
dist: packages/backend/dist/services/ooxml-meta.js:29
