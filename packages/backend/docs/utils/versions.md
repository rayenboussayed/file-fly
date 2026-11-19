## Constants

<dl>
<dt><a href="#PDQ_WASM_VERSION">PDQ_WASM_VERSION</a></dt>
<dd><p>Version of the installed <code>pdq-wasm</code> package.</p>
</dd>
<dt><a href="#NODE_AV_VERSION">NODE_AV_VERSION</a></dt>
<dd><p>Version of the installed <code>node-av</code> package (media backend).</p>
</dd>
<dt><a href="#SHARP_VERSION">SHARP_VERSION</a></dt>
<dd><p>Version of the installed <code>sharp</code> package.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#packageVersion">packageVersion(name, fromDir)</a> ⇒ <code>string</code></dt>
<dd><p>Reads an installed package&#39;s version from its <code>package.json</code>.</p>
<p>Subpath imports such as <code>require(&#39;sharp/package.json&#39;)</code> are blocked by
those packages&#39; <code>exports</code> maps, so the entry point is resolved first and
the directory tree is walked upward until the matching <code>package.json</code>
is found.</p>
</dd>
</dl>

<a name="PDQ_WASM_VERSION"></a>

## PDQ\_WASM\_VERSION
Version of the installed `pdq-wasm` package.

**Kind**: global constant  
src: packages/backend/src/utils/versions.ts:46  
dist: packages/backend/dist/utils/versions.js:29
<a name="NODE_AV_VERSION"></a>

## NODE\_AV\_VERSION
Version of the installed `node-av` package (media backend).

**Kind**: global constant  
src: packages/backend/src/utils/versions.ts:48  
dist: packages/backend/dist/utils/versions.js:30
<a name="SHARP_VERSION"></a>

## SHARP\_VERSION
Version of the installed `sharp` package.

**Kind**: global constant  
src: packages/backend/src/utils/versions.ts:50  
dist: packages/backend/dist/utils/versions.js:31
<a name="packageVersion"></a>

## packageVersion(name, fromDir) ⇒ <code>string</code>
Reads an installed package's version from its `package.json`.

Subpath imports such as `require('sharp/package.json')` are blocked by
those packages' `exports` maps, so the entry point is resolved first and
the directory tree is walked upward until the matching `package.json`
is found.

**Kind**: global function  
**Returns**: <code>string</code> - The package version string.  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | The package name to look up. |
| fromDir | <code>string</code> | Optional directory to start the walk-up from (defaults to the resolved package entry's directory). |

src: packages/backend/src/utils/versions.ts:18  
dist: packages/backend/dist/utils/versions.js:5
