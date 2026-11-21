## Constants

<dl>
<dt><a href="#CACHE_DIR">CACHE_DIR</a></dt>
<dd><p>Cache root (absolute); processed media output and the undici cache live here.</p>
</dd>
<dt><a href="#CACHE_TTL_MS">CACHE_TTL_MS</a></dt>
<dd><p>Entries not used for this long are evicted.</p>
</dd>
<dt><a href="#CACHE_MAX_BYTES">CACHE_MAX_BYTES</a></dt>
<dd><p>Soft cap for output entries; the undici store is excluded from the sweep.</p>
</dd>
<dt><a href="#UNDICI_CACHE_FILE">UNDICI_CACHE_FILE</a></dt>
<dd><p>File backing undici&#39;s HTTP cache. Its WAL sidecars share this prefix.</p>
</dd>
<dt><a href="#CACHE_SWEEP_INTERVAL_MS">CACHE_SWEEP_INTERVAL_MS</a></dt>
<dd><p>How often the cache janitor sweeps.</p>
</dd>
<dt><a href="#CACHE_TMP_MAX_AGE_MS">CACHE_TMP_MAX_AGE_MS</a></dt>
<dd><p>Orphaned *.tmp files (crashed writers) older than this are removed.</p>
</dd>
<dt><a href="#TESSERACT_DIR">TESSERACT_DIR</a></dt>
<dd><p>Directory where tesseract.js stores its (gzipped) language data.</p>
</dd>
</dl>

<a name="CACHE_DIR"></a>

## CACHE\_DIR
Cache root (absolute); processed media output and the undici cache live here.

**Kind**: global constant  
src: packages/backend/src/constants/fs.ts:6  
dist: packages/backend/dist/constants/fs.js:3
<a name="CACHE_TTL_MS"></a>

## CACHE\_TTL\_MS
Entries not used for this long are evicted.

**Kind**: global constant  
src: packages/backend/src/constants/fs.ts:11  
dist: packages/backend/dist/constants/fs.js:5
<a name="CACHE_MAX_BYTES"></a>

## CACHE\_MAX\_BYTES
Soft cap for output entries; the undici store is excluded from the sweep.

**Kind**: global constant  
src: packages/backend/src/constants/fs.ts:13  
dist: packages/backend/dist/constants/fs.js:6
<a name="UNDICI_CACHE_FILE"></a>

## UNDICI\_CACHE\_FILE
File backing undici's HTTP cache. Its WAL sidecars share this prefix.

**Kind**: global constant  
src: packages/backend/src/constants/fs.ts:15  
dist: packages/backend/dist/constants/fs.js:7
<a name="CACHE_SWEEP_INTERVAL_MS"></a>

## CACHE\_SWEEP\_INTERVAL\_MS
How often the cache janitor sweeps.

**Kind**: global constant  
src: packages/backend/src/constants/fs.ts:17  
dist: packages/backend/dist/constants/fs.js:8
<a name="CACHE_TMP_MAX_AGE_MS"></a>

## CACHE\_TMP\_MAX\_AGE\_MS
Orphaned *.tmp files (crashed writers) older than this are removed.

**Kind**: global constant  
src: packages/backend/src/constants/fs.ts:19  
dist: packages/backend/dist/constants/fs.js:9
<a name="TESSERACT_DIR"></a>

## TESSERACT\_DIR
Directory where tesseract.js stores its (gzipped) language data.

**Kind**: global constant  
src: packages/backend/src/constants/fs.ts:21  
dist: packages/backend/dist/constants/fs.js:19 (approx.)
