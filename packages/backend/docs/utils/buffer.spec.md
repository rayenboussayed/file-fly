## Constants

<dl>
<dt><a href="#BUFFER_API_SURFACE">BUFFER_API_SURFACE</a></dt>
<dd><p>Named symbol for the mdaics docs site (see <a href="https://github.com/rayenboussayed/mdaics">https://github.com/rayenboussayed/mdaics</a>); no runtime use.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#chunks">chunks()</a> ⇒ <code>Generator&lt;Buffer&lt;ArrayBufferLike&gt;, any, any&gt;</code></dt>
<dd><p>Yields 21 one-MiB chunks to exceed the 20 MiB cap.</p>
</dd>
</dl>

<a name="BUFFER_API_SURFACE"></a>

## BUFFER\_API\_SURFACE
Named symbol for the mdaics docs site (see https://github.com/rayenboussayed/mdaics); no runtime use.

**Kind**: global constant  
src: packages/backend/src/utils/buffer.spec.ts:75  
<a name="chunks"></a>

## chunks() ⇒ <code>Generator&lt;Buffer&lt;ArrayBufferLike&gt;, any, any&gt;</code>
Yields 21 one-MiB chunks to exceed the 20 MiB cap.

**Kind**: global function  
src: packages/backend/src/utils/buffer.spec.ts:11  
