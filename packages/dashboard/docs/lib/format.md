## Functions

<dl>
<dt><a href="#formatBytes">formatBytes(bytes)</a> ⇒ <code>string</code></dt>
<dd><p>Formats a byte count with binary (1024) units.</p>
</dd>
<dt><a href="#formatCount">formatCount(value)</a> ⇒ <code>string</code></dt>
<dd><p>Formats a count with thousands separators.</p>
</dd>
<dt><a href="#formatHourBucket">formatHourBucket(bucket)</a> ⇒ <code>string</code></dt>
<dd><p>Turns an ISO hour bucket into an axis label like <code>11-17 14:00</code>.</p>
</dd>
<dt><a href="#formatMs">formatMs(ms)</a> ⇒ <code>string</code></dt>
<dd><p>Formats a duration given in milliseconds.</p>
</dd>
<dt><a href="#formatPercent">formatPercent(ratio, digits)</a> ⇒ <code>string</code></dt>
<dd><p>Formats a ratio as a percentage.</p>
</dd>
</dl>

<a name="formatBytes"></a>

## formatBytes(bytes) ⇒ <code>string</code>
Formats a byte count with binary (1024) units.

**Kind**: global function  
**Returns**: <code>string</code> - Human-readable string such as `1.5 GB`.  

| Param | Type | Description |
| --- | --- | --- |
| bytes | <code>number</code> | Size in bytes; non-finite or negative values format as `0 B`. |

src: packages/dashboard/src/lib/format.ts:8  
<a name="formatCount"></a>

## formatCount(value) ⇒ <code>string</code>
Formats a count with thousands separators.

**Kind**: global function  
**Returns**: <code>string</code> - Locale-formatted string such as `1,234,567`.  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>number</code> | The count to format. |

src: packages/dashboard/src/lib/format.ts:22  
<a name="formatHourBucket"></a>

## formatHourBucket(bucket) ⇒ <code>string</code>
Turns an ISO hour bucket into an axis label like `11-17 14:00`.

**Kind**: global function  
**Returns**: <code>string</code> - Day and hour, e.g. `11-17 14:00`; `00:00` for malformed input.  

| Param | Type | Description |
| --- | --- | --- |
| bucket | <code>string</code> | ISO hour bucket, e.g. `2026-11-17T14`. |

src: packages/dashboard/src/lib/format.ts:31  
<a name="formatMs"></a>

## formatMs(ms) ⇒ <code>string</code>
Formats a duration given in milliseconds.

**Kind**: global function  
**Returns**: <code>string</code> - String such as `12.3 ms`.  

| Param | Type | Description |
| --- | --- | --- |
| ms | <code>number</code> | Duration in milliseconds; non-finite or negative values format as `0 ms`. |

src: packages/dashboard/src/lib/format.ts:41  
<a name="formatPercent"></a>

## formatPercent(ratio, digits) ⇒ <code>string</code>
Formats a ratio as a percentage.

**Kind**: global function  
**Returns**: <code>string</code> - Percent string such as `87.5%`, or `0%` for non-finite input.  

| Param | Type | Description |
| --- | --- | --- |
| ratio | <code>number</code> | Value in the range [0, 1]. |
| digits | <code>number</code> | Number of decimals to show. |

src: packages/dashboard/src/lib/format.ts:53  
