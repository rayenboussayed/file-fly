## Constants

<dl>
<dt><a href="#ALLOWED_URL_SCHEMES">ALLOWED_URL_SCHEMES</a></dt>
<dd><p>URL schemes allowed for hrefs written into generated documents (Word/PowerPoint open these).</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#hyperlinkUrlOk">hyperlinkUrlOk(url)</a> ⇒ <code>boolean</code></dt>
<dd><p>Whether a URL uses one of the allowed schemes (http, https, mailto).
Generated documents opened by Word/PowerPoint will follow <code>javascript:</code> and <code>file:</code> links,
so anything else is rejected at the boundary.</p>
</dd>
</dl>

<a name="ALLOWED_URL_SCHEMES"></a>

## ALLOWED\_URL\_SCHEMES
URL schemes allowed for hrefs written into generated documents (Word/PowerPoint open these).

**Kind**: global constant  
src: packages/backend/src/utils/hyperlinks.ts:2  
dist: packages/backend/dist/utils/hyperlinks.js:1
<a name="hyperlinkUrlOk"></a>

## hyperlinkUrlOk(url) ⇒ <code>boolean</code>
Whether a URL uses one of the allowed schemes (http, https, mailto).
Generated documents opened by Word/PowerPoint will follow `javascript:` and `file:` links,
so anything else is rejected at the boundary.

**Kind**: global function  
**Returns**: <code>boolean</code> - True for http, https and mailto links.  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> | The absolute URL to check. |

src: packages/backend/src/utils/hyperlinks.ts:11  
dist: packages/backend/dist/utils/hyperlinks.js:2
