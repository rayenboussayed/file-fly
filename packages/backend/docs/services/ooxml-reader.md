## Classes

<dl>
<dt><a href="#OoxmlError">OoxmlError</a></dt>
<dd><p>Error thrown for any OOXML structural problem; maps to HTTP 400/415 at the boundary.</p>
</dd>
<dt><a href="#OoxmlReader">OoxmlReader</a></dt>
<dd><p>Opens an OOXML package (docx/pptx/xlsx) from a buffer and extracts its parts.
Packages are ordinary zips; the signature interceptor guarantees the mime, while
this validates the zip structure itself with conservative caps.</p>
<p>In-memory only by design; entries are never written to disk.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#OOXML_LIMITS">OOXML_LIMITS</a></dt>
<dd><p>Hard limits applied to every OOXML package read, enforced before inflating.</p>
</dd>
</dl>

<a name="OoxmlError"></a>

## OoxmlError
Error thrown for any OOXML structural problem; maps to HTTP 400/415 at the boundary.

**Kind**: global class  
src: packages/backend/src/services/ooxml-reader.ts:24  
dist: packages/backend/dist/services/ooxml-reader.js:7
<a name="OoxmlReader"></a>

## OoxmlReader
Opens an OOXML package (docx/pptx/xlsx) from a buffer and extracts its parts.
Packages are ordinary zips; the signature interceptor guarantees the mime, while
this validates the zip structure itself with conservative caps.

In-memory only by design; entries are never written to disk.

**Kind**: global class  
src: packages/backend/src/services/ooxml-reader.ts:33  
dist: packages/backend/dist/services/ooxml-reader.js:9

* [OoxmlReader](#OoxmlReader)
    * [.partText(parts, name)](#OoxmlReader.partText) ⇒ <code>string</code>
    * [.readParts(buffer, limits)](#OoxmlReader.readParts) ⇒ <code>Map&lt;string, Buffer&lt;ArrayBufferLike&gt;&gt;</code>

<a name="OoxmlReader.partText"></a>

### OoxmlReader.partText(parts, name) ⇒ <code>string</code>
Reads the parts as utf-8 strings.

**Kind**: static method of [<code>OoxmlReader</code>](#OoxmlReader)  
**Returns**: <code>string</code> - The utf-8 text, or `undefined` when the part is absent.  

| Param | Type | Description |
| --- | --- | --- |
| parts | <code>Map&lt;string, Buffer&lt;ArrayBufferLike&gt;&gt;</code> | The parts returned by [readParts](#OoxmlReader.readParts). |
| name | <code>string</code> | Zip path of the part to read. |

src: packages/backend/src/services/ooxml-reader.ts:40  
dist: packages/backend/dist/services/ooxml-reader.js:10
<a name="OoxmlReader.readParts"></a>

### OoxmlReader.readParts(buffer, limits) ⇒ <code>Map&lt;string, Buffer&lt;ArrayBufferLike&gt;&gt;</code>
Reads every entry of the package into memory.

fflate allocates each output buffer at the declared `originalSize`, so the
header caps below also bound the bytes actually inflated. Revisit this if
the fflate version changes that behavior.

**Kind**: static method of [<code>OoxmlReader</code>](#OoxmlReader)  
**Returns**: <code>Map&lt;string, Buffer&lt;ArrayBufferLike&gt;&gt;</code> - The parts, keyed by zip path (e.g. `docProps/core.xml`).  
**Throws**:

- [<code>OoxmlError</code>](#OoxmlError) On structural problems: invalid zip, entry count, or uncompressed size caps.


| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>Buffer&lt;ArrayBufferLike&gt;</code> | The full, already upload-capped file. |
| limits | <code>OoxmlReadLimits</code> | Optional per-call cap overrides. |

src: packages/backend/src/services/ooxml-reader.ts:55  
dist: packages/backend/dist/services/ooxml-reader.js:13
<a name="OOXML_LIMITS"></a>

## OOXML\_LIMITS
Hard limits applied to every OOXML package read, enforced before inflating.

**Kind**: global constant  
src: packages/backend/src/services/ooxml-reader.ts:4  
dist: packages/backend/dist/services/ooxml-reader.js:2

* [OOXML_LIMITS](#OOXML_LIMITS)
    * [.maxEntries](#OOXML_LIMITS.maxEntries)
    * [.maxEntryUncompressed](#OOXML_LIMITS.maxEntryUncompressed)
    * [.maxTotalUncompressed](#OOXML_LIMITS.maxTotalUncompressed)

<a name="OOXML_LIMITS.maxEntries"></a>

### OOXML_LIMITS.maxEntries
Maximum number of zip entries inspected (central directory scan).

**Kind**: static property of [<code>OOXML\_LIMITS</code>](#OOXML_LIMITS)  
src: packages/backend/src/services/ooxml-reader.ts:6  
dist: packages/backend/dist/services/ooxml-reader.js:3
<a name="OOXML_LIMITS.maxEntryUncompressed"></a>

### OOXML_LIMITS.maxEntryUncompressed
Maximum uncompressed size of a single entry.

**Kind**: static property of [<code>OOXML\_LIMITS</code>](#OOXML_LIMITS)  
src: packages/backend/src/services/ooxml-reader.ts:8  
dist: packages/backend/dist/services/ooxml-reader.js:4
<a name="OOXML_LIMITS.maxTotalUncompressed"></a>

### OOXML_LIMITS.maxTotalUncompressed
Maximum uncompressed bytes of the whole package.

**Kind**: static property of [<code>OOXML\_LIMITS</code>](#OOXML_LIMITS)  
src: packages/backend/src/services/ooxml-reader.ts:10  
dist: packages/backend/dist/services/ooxml-reader.js:5
