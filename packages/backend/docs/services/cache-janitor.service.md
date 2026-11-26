## Members

<dl>
<dt><a href="#CacheJanitorService">CacheJanitorService</a></dt>
<dd><p>Continuous cache maintenance: TTL, size cap (least-recently-used first), orphan cleanup.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#UNDICI_CACHE_PREFIX">UNDICI_CACHE_PREFIX</a></dt>
<dd><p>Sidecars such as <code>-wal</code> and <code>-shm</code> share the store&#39;s file name as a prefix.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#isCacheEntryRemoved">isCacheEntryRemoved(file, logger)</a> ⇒ <code>Promise&lt;boolean&gt;</code></dt>
<dd><p>Removes one cache entry, reporting failures without aborting the sweep.</p>
</dd>
<dt><a href="#safeStat">safeStat(file)</a> ⇒ <code>Promise&lt;Stats&gt;</code></dt>
<dd><p>Stats a file without throwing when it is missing.</p>
</dd>
</dl>

<a name="CacheJanitorService"></a>

## CacheJanitorService
Continuous cache maintenance: TTL, size cap (least-recently-used first), orphan cleanup.

**Kind**: global variable  
src: packages/backend/src/services/cache-janitor.service.ts:49  
dist: packages/backend/dist/services/cache-janitor.service.js:23
<a name="UNDICI_CACHE_PREFIX"></a>

## UNDICI\_CACHE\_PREFIX
Sidecars such as `-wal` and `-shm` share the store's file name as a prefix.

**Kind**: global constant  
src: packages/backend/src/services/cache-janitor.service.ts:27  
dist: packages/backend/dist/services/cache-janitor.service.js:12
<a name="isCacheEntryRemoved"></a>

## isCacheEntryRemoved(file, logger) ⇒ <code>Promise&lt;boolean&gt;</code>
Removes one cache entry, reporting failures without aborting the sweep.

**Kind**: global function  
**Returns**: <code>Promise&lt;boolean&gt;</code> - True when the entry was removed (or already absent).  

| Param | Type | Description |
| --- | --- | --- |
| file | <code>string</code> | Absolute path of the entry to remove. |
| logger | <code>Logger</code> | Logger used to report a failed removal. |

src: packages/backend/src/services/cache-janitor.service.ts:35  
dist: packages/backend/dist/services/cache-janitor.service.js:13
<a name="safeStat"></a>

## safeStat(file) ⇒ <code>Promise&lt;Stats&gt;</code>
Stats a file without throwing when it is missing.

**Kind**: global function  
**Returns**: <code>Promise&lt;Stats&gt;</code> - The stat result, or undefined when the file cannot be read.  

| Param | Type | Description |
| --- | --- | --- |
| file | <code>string</code> | Absolute path to stat. |

src: packages/backend/src/services/cache-janitor.service.ts:125  
dist: packages/backend/dist/services/cache-janitor.service.js:94
