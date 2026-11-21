<a name="AppController"></a>

## AppController
Root routes: signature and antivirus verdicts for scanned payloads.

**Kind**: global variable  
src: packages/backend/src/app.controller.ts:13  
dist: packages/backend/dist/app.controller.js:13

* [AppController](#AppController)
    * [.signatureGet()](#AppController+signatureGet) ⇒ <code>{ ext: any; mime: any; }</code>
    * [.signaturePost()](#AppController+signaturePost) ⇒ <code>{ ext: any; mime: any; }</code>
    * [.virusScanGet()](#AppController+virusScanGet) ⇒ <code>{ isInfected: any; viruses: any; }</code>
    * [.virusScanPost()](#AppController+virusScanPost) ⇒ <code>{ isInfected: any; viruses: any; }</code>
    * [.signature()](#AppController+signature) ⇒ <code>{ ext: any; mime: any; }</code>
    * [.virusScan()](#AppController+virusScan) ⇒ <code>{ isInfected: any; viruses: any; }</code>

<a name="AppController+signatureGet"></a>

### appController.signatureGet() ⇒ <code>{ ext: any; mime: any; }</code>
Returns the detected signature of the scanned file (GET).

**Kind**: instance method of [<code>AppController</code>](#AppController)  
**Returns**: <code>{ ext: any; mime: any; }</code> - The file signature's extension and MIME type.  
src: packages/backend/src/app.controller.ts:24  
dist: packages/backend/dist/app.controller.js:18
<a name="AppController+signaturePost"></a>

### appController.signaturePost() ⇒ <code>{ ext: any; mime: any; }</code>
Returns the detected signature of the scanned file (POST).

**Kind**: instance method of [<code>AppController</code>](#AppController)  
**Returns**: <code>{ ext: any; mime: any; }</code> - The file signature's extension and MIME type.  
src: packages/backend/src/app.controller.ts:34  
dist: packages/backend/dist/app.controller.js:21
<a name="AppController+virusScanGet"></a>

### appController.virusScanGet() ⇒ <code>{ isInfected: any; viruses: any; }</code>
Returns the antivirus scan result for the scanned file (GET).

**Kind**: instance method of [<code>AppController</code>](#AppController)  
**Returns**: <code>{ isInfected: any; viruses: any; }</code> - Whether the file is infected and the list of detected viruses.  
src: packages/backend/src/app.controller.ts:44  
dist: packages/backend/dist/app.controller.js:24
<a name="AppController+virusScanPost"></a>

### appController.virusScanPost() ⇒ <code>{ isInfected: any; viruses: any; }</code>
Returns the antivirus scan result for the scanned file (POST).

**Kind**: instance method of [<code>AppController</code>](#AppController)  
**Returns**: <code>{ isInfected: any; viruses: any; }</code> - Whether the file is infected and the list of detected viruses.  
src: packages/backend/src/app.controller.ts:54  
dist: packages/backend/dist/app.controller.js:27
<a name="AppController+signature"></a>

### appController.signature() ⇒ <code>{ ext: any; mime: any; }</code>
Reads the file signature from CLS.

**Kind**: instance method of [<code>AppController</code>](#AppController)  
**Returns**: <code>{ ext: any; mime: any; }</code> - The file signature's extension and MIME type.  
**Throws**:

- ServiceUnavailableException When no file signature is available in CLS.

src: packages/backend/src/app.controller.ts:63  
dist: packages/backend/dist/app.controller.js:30
<a name="AppController+virusScan"></a>

### appController.virusScan() ⇒ <code>{ isInfected: any; viruses: any; }</code>
Reads the antivirus scan result from CLS.

**Kind**: instance method of [<code>AppController</code>](#AppController)  
**Returns**: <code>{ isInfected: any; viruses: any; }</code> - Whether the file is infected and the list of detected viruses.  
**Throws**:

- ServiceUnavailableException When no scan result is available in CLS (antivirus not configured).

src: packages/backend/src/app.controller.ts:74  
dist: packages/backend/dist/app.controller.js:36
