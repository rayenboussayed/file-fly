## Members

<dl>
<dt><a href="#AppController">AppController</a></dt>
<dd><p>Root routes: signature and antivirus verdicts for scanned payloads.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#signatureOf">signatureOf(normalizedCls)</a> ⇒ <code>{ ext: any; mime: any; }</code></dt>
<dd><p>Reads the file signature from CLS.</p>
</dd>
<dt><a href="#virusScanOf">virusScanOf(normalizedCls)</a> ⇒ <code>{ isInfected: any; viruses: any; }</code></dt>
<dd><p>Reads the antivirus scan result from CLS.</p>
</dd>
</dl>

<a name="AppController"></a>

## AppController
Root routes: signature and antivirus verdicts for scanned payloads.

**Kind**: global variable  
src: packages/backend/src/app.controller.ts:39  
dist: packages/backend/dist/app.controller.js:25

* [AppController](#AppController)
    * [.signatureGet()](#AppController+signatureGet) ⇒ <code>{ ext: any; mime: any; }</code>
    * [.signaturePost()](#AppController+signaturePost) ⇒ <code>{ ext: any; mime: any; }</code>
    * [.virusScanGet()](#AppController+virusScanGet) ⇒ <code>{ isInfected: any; viruses: any; }</code>
    * [.virusScanPost()](#AppController+virusScanPost) ⇒ <code>{ isInfected: any; viruses: any; }</code>

<a name="AppController+signatureGet"></a>

### appController.signatureGet() ⇒ <code>{ ext: any; mime: any; }</code>
Returns the detected signature of the scanned file (GET).

**Kind**: instance method of [<code>AppController</code>](#AppController)  
**Returns**: <code>{ ext: any; mime: any; }</code> - The file signature's extension and MIME type.  
src: packages/backend/src/app.controller.ts:50  
dist: packages/backend/dist/app.controller.js:30
<a name="AppController+signaturePost"></a>

### appController.signaturePost() ⇒ <code>{ ext: any; mime: any; }</code>
Returns the detected signature of the scanned file (POST).

**Kind**: instance method of [<code>AppController</code>](#AppController)  
**Returns**: <code>{ ext: any; mime: any; }</code> - The file signature's extension and MIME type.  
src: packages/backend/src/app.controller.ts:60  
dist: packages/backend/dist/app.controller.js:33
<a name="AppController+virusScanGet"></a>

### appController.virusScanGet() ⇒ <code>{ isInfected: any; viruses: any; }</code>
Returns the antivirus scan result for the scanned file (GET).

**Kind**: instance method of [<code>AppController</code>](#AppController)  
**Returns**: <code>{ isInfected: any; viruses: any; }</code> - Whether the file is infected and the list of detected viruses.  
src: packages/backend/src/app.controller.ts:70  
dist: packages/backend/dist/app.controller.js:36
<a name="AppController+virusScanPost"></a>

### appController.virusScanPost() ⇒ <code>{ isInfected: any; viruses: any; }</code>
Returns the antivirus scan result for the scanned file (POST).

**Kind**: instance method of [<code>AppController</code>](#AppController)  
**Returns**: <code>{ isInfected: any; viruses: any; }</code> - Whether the file is infected and the list of detected viruses.  
src: packages/backend/src/app.controller.ts:80  
dist: packages/backend/dist/app.controller.js:39
<a name="signatureOf"></a>

## signatureOf(normalizedCls) ⇒ <code>{ ext: any; mime: any; }</code>
Reads the file signature from CLS.

**Kind**: global function  
**Returns**: <code>{ ext: any; mime: any; }</code> - The file signature's extension and MIME type.  
**Throws**:

- ServiceUnavailableException When no file signature is available in CLS.


| Param | Type | Description |
| --- | --- | --- |
| normalizedCls | <code>NormalizedClsService</code> | CLS facade carrying the scanned request's signature. |

src: packages/backend/src/app.controller.ts:17  
dist: packages/backend/dist/app.controller.js:13
<a name="virusScanOf"></a>

## virusScanOf(normalizedCls) ⇒ <code>{ isInfected: any; viruses: any; }</code>
Reads the antivirus scan result from CLS.

**Kind**: global function  
**Returns**: <code>{ isInfected: any; viruses: any; }</code> - Whether the file is infected and the list of detected viruses.  
**Throws**:

- ServiceUnavailableException When no scan result is available in CLS (antivirus not configured).


| Param | Type | Description |
| --- | --- | --- |
| normalizedCls | <code>NormalizedClsService</code> | CLS facade carrying the scan verdict. |

src: packages/backend/src/app.controller.ts:29  
dist: packages/backend/dist/app.controller.js:19
