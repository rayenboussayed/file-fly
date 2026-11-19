## Constants

<dl>
<dt><a href="#xml">xml</a></dt>
<dd><p>Shared fast-xml-parser configuration for OOXML parts: entities are never
expanded, namespace prefixes are stripped (producers vary), attributes are
kept, tag values are not coerced.</p>
</dd>
<dt><a href="#xmlRaw">xmlRaw</a></dt>
<dd><p>Namespace-preserving variant of <a href="#xml">xml</a>, for parts where <code>id</code> and <code>r:id</code>
must not collide (presentation.xml&#39;s sldId list). Attribute keys keep their
full names (<code>@_r:id</code>, <code>@_id</code>).</p>
</dd>
<dt><a href="#attr">attr</a> ⇒ <code>string</code></dt>
<dd><p>Reads an attribute (namespace prefixes are stripped before parse).</p>
</dd>
<dt><a href="#walkXml">walkXml</a></dt>
<dd><p>Depth-first walk of a parsed XML tree; visits every key/value pair.</p>
</dd>
<dt><a href="#collectByKey">collectByKey</a> ⇒ <code>unknown[]</code></dt>
<dd><p>Every element under a given key, anywhere in the tree.</p>
</dd>
<dt><a href="#collectByLocalName">collectByLocalName</a> ⇒ <code>unknown[]</code></dt>
<dd><p>Every element under a given local name, ignoring namespace prefixes (any alias).</p>
</dd>
<dt><a href="#textOf">textOf</a> ⇒ <code>string</code></dt>
<dd><p>Concatenated text of every &lt;w:t&gt;/&lt;a:t&gt; under a node (attributes ignored).</p>
</dd>
<dt><a href="#collectRelationships">collectRelationships</a> ⇒ <code>Map&lt;string, RelationshipInfo&gt;</code></dt>
<dd><p>Maps r:id to its target for a .rels part.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#textValue">textValue(value)</a> ⇒ <code>string</code></dt>
<dd><p>A &lt;w:t&gt;/&lt;a:t&gt; node may be a plain string or { &#39;#text&#39;: string } when attributes are kept.</p>
</dd>
</dl>

<a name="xml"></a>

## xml
Shared fast-xml-parser configuration for OOXML parts: entities are never
expanded, namespace prefixes are stripped (producers vary), attributes are
kept, tag values are not coerced.

**Kind**: global constant  
src: packages/backend/src/services/ooxml-xml.ts:8  
dist: packages/backend/dist/services/ooxml-xml.js:2
<a name="xmlRaw"></a>

## xmlRaw
Namespace-preserving variant of [xml](#xml), for parts where `id` and `r:id`
must not collide (presentation.xml's sldId list). Attribute keys keep their
full names (`@_r:id`, `@_id`).

**Kind**: global constant  
src: packages/backend/src/services/ooxml-xml.ts:21  
dist: packages/backend/dist/services/ooxml-xml.js:9
<a name="attr"></a>

## attr ⇒ <code>string</code>
Reads an attribute (namespace prefixes are stripped before parse).

**Kind**: global constant  
**Returns**: <code>string</code> - The attribute string, or ''.  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>unknown</code> | The parsed element (or attribute holder). |
| name | <code>string</code> | The attribute name without its `@_` prefix. |

src: packages/backend/src/services/ooxml-xml.ts:35  
dist: packages/backend/dist/services/ooxml-xml.js:16
<a name="walkXml"></a>

## walkXml
Depth-first walk of a parsed XML tree; visits every key/value pair.

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>unknown</code> | The parsed XML node (or subtree). |
| visit | <code>(key: string, value: unknown) &#x3D;&gt; void</code> | Callback per key/value pair; may throw to abort the walk. |

src: packages/backend/src/services/ooxml-xml.ts:48  
dist: packages/backend/dist/services/ooxml-xml.js:24
<a name="collectByKey"></a>

## collectByKey ⇒ <code>unknown[]</code>
Every element under a given key, anywhere in the tree.

**Kind**: global constant  
**Returns**: <code>unknown[]</code> - The matched elements, in document order.  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>unknown</code> | The parsed XML node (or subtree). |
| key | <code>string</code> | The local (namespace-stripped) element name, e.g. `p`, `tbl`, `tr`. |

src: packages/backend/src/services/ooxml-xml.ts:67  
dist: packages/backend/dist/services/ooxml-xml.js:39
<a name="collectByLocalName"></a>

## collectByLocalName ⇒ <code>unknown[]</code>
Every element under a given local name, ignoring namespace prefixes (any alias).

**Kind**: global constant  
**Returns**: <code>unknown[]</code> - The matched elements, in document order.  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>unknown</code> | The parsed XML node (or subtree), with prefixes preserved. |
| localName | <code>string</code> | The element's local name without its prefix. |

src: packages/backend/src/services/ooxml-xml.ts:82  
dist: packages/backend/dist/services/ooxml-xml.js:49
<a name="textOf"></a>

## textOf ⇒ <code>string</code>
Concatenated text of every <w:t>/<a:t> under a node (attributes ignored).

**Kind**: global constant  
**Returns**: <code>string</code> - The concatenated string.  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>unknown</code> | The parsed XML node (or subtree). |

src: packages/backend/src/services/ooxml-xml.ts:111  
dist: packages/backend/dist/services/ooxml-xml.js:69
<a name="collectRelationships"></a>

## collectRelationships ⇒ <code>Map&lt;string, RelationshipInfo&gt;</code>
Maps r:id to its target for a .rels part.

**Kind**: global constant  
**Returns**: <code>Map&lt;string, RelationshipInfo&gt;</code> - The id-to-target map.  

| Param | Type | Description |
| --- | --- | --- |
| relsXml | <code>string</code> | The raw rels XML, or undefined. |

src: packages/backend/src/services/ooxml-xml.ts:134  
dist: packages/backend/dist/services/ooxml-xml.js:80
<a name="textValue"></a>

## textValue(value) ⇒ <code>string</code>
A <w:t>/<a:t> node may be a plain string or { '#text': string } when attributes are kept.

**Kind**: global function  
**Returns**: <code>string</code> - The string, or ''.  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>unknown</code> | The text node value. |

src: packages/backend/src/services/ooxml-xml.ts:97  
dist: packages/backend/dist/services/ooxml-xml.js:59
