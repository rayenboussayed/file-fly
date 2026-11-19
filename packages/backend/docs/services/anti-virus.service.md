## Members

<dl>
<dt><a href="#AntiVirusService">AntiVirusService</a></dt>
<dd><p>Scans the request payload with ClamAV (INSTREAM via <code>clamd</code>) before it is
processed further.</p>
<p>When <code>CLAMAV_HOST</code> or <code>CLAMAV_PORT</code> is unset the integration is disabled and
callers are expected to skip it entirely (see <a href="enabled">enabled</a>); the scan
itself assumes the daemon is configured and fails closed otherwise.</p>
<p>A declared <code>content-length</code> above <code>CLAMAV_MAX_BYTES</code> is rejected with
<code>PayloadTooLargeException</code> before the body is read. Otherwise the body is
buffered once (bounded by <code>CLAMAV_MAX_BYTES</code>, same pattern as the OCR
pipeline) so the verdict can be delivered before any worker sees a single
byte; after a clean verdict the buffered body is replayed into the pipeline
as a fresh <code>Readable</code>. Buffering (rather than teeing) is deliberate: a tee
branch that nobody has consumed yet stalls at 16 KiB and starves the scan,
which deadlocks every body past the buffer high-water mark.</p>
<p>The method fails closed: no outcome other than a conclusive &quot;clean&quot; answer
is ever reported as safe — infected payloads, inconclusive daemon replies,
oversized bodies and scanner errors all throw.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#loadClamAv">loadClamAv</a> ⇒</dt>
<dd><p>Builds the ClamAV client at most once per process; the initialized instance
is reused for every scan. The connection is tested with a ping at init time
(<code>bypassTest: false</code>), so an unreachable daemon rejects here and every caller
maps that to <code>ServiceUnavailableException</code>. A rejected initialization is
dropped from the memoization cache, so the next call retries from scratch.</p>
</dd>
</dl>

<a name="AntiVirusService"></a>

## AntiVirusService
Scans the request payload with ClamAV (INSTREAM via `clamd`) before it is
processed further.

When `CLAMAV_HOST` or `CLAMAV_PORT` is unset the integration is disabled and
callers are expected to skip it entirely (see [enabled](enabled)); the scan
itself assumes the daemon is configured and fails closed otherwise.

A declared `content-length` above `CLAMAV_MAX_BYTES` is rejected with
`PayloadTooLargeException` before the body is read. Otherwise the body is
buffered once (bounded by `CLAMAV_MAX_BYTES`, same pattern as the OCR
pipeline) so the verdict can be delivered before any worker sees a single
byte; after a clean verdict the buffered body is replayed into the pipeline
as a fresh `Readable`. Buffering (rather than teeing) is deliberate: a tee
branch that nobody has consumed yet stalls at 16 KiB and starves the scan,
which deadlocks every body past the buffer high-water mark.

The method fails closed: no outcome other than a conclusive "clean" answer
is ever reported as safe — infected payloads, inconclusive daemon replies,
oversized bodies and scanner errors all throw.

**Kind**: global variable  
src: packages/backend/src/services/anti-virus.service.ts:90  
dist: packages/backend/dist/services/anti-virus.service.js:40

* [AntiVirusService](#AntiVirusService)
    * [.enabled()](#AntiVirusService+enabled) ⇒ <code>boolean</code>
    * [.scan(options)](#AntiVirusService+scan) ⇒ <code>Promise&lt;AntiVirusScanResult&gt;</code>

<a name="AntiVirusService+enabled"></a>

### antiVirusService.enabled() ⇒ <code>boolean</code>
Whether the ClamAV integration is configured. Read at call time so tests
can flip the environment between assertions.

**Kind**: instance method of [<code>AntiVirusService</code>](#AntiVirusService)  
**Returns**: <code>boolean</code> - True when both `CLAMAV_HOST` and `CLAMAV_PORT` are set.  
src: packages/backend/src/services/anti-virus.service.ts:104  
dist: packages/backend/dist/services/anti-virus.service.js:46
<a name="AntiVirusService+scan"></a>

### antiVirusService.scan(options) ⇒ <code>Promise&lt;AntiVirusScanResult&gt;</code>
Buffers the full payload (bounded by `CLAMAV_MAX_BYTES`), scans the
buffer with ClamAV, then replaces the CLS source stream with a replay
`Readable` so the downstream pipeline consumes the body as usual.

On any failure the source stream is destroyed and the pipeline is never
started: fail-closed, like everywhere else in this service. After a
clean verdict CLS holds `{ isInfected: false, viruses: [] }` and the
replayed body is handed downstream.

**Kind**: instance method of [<code>AntiVirusService</code>](#AntiVirusService)  
**Returns**: <code>Promise&lt;AntiVirusScanResult&gt;</code> - The clean verdict, stored in CLS.  
**Throws**:

- PayloadTooLargeException When the payload exceeds `CLAMAV_MAX_BYTES`; clamd is never contacted.
- UnprocessableEntityException When clamd reports an infected payload.
- ServiceUnavailableException When clamd replies inconclusively, or the client cannot initialize/scan.


| Param | Type | Description |
| --- | --- | --- |
| options | <code>{ stream: Readable; }</code> | Object carrying the request source stream to scan. |
| options.stream |  | The source stream (upload `request.raw` or the download body); replaced in CLS on success. |

src: packages/backend/src/services/anti-virus.service.ts:124  
dist: packages/backend/dist/services/anti-virus.service.js:49
<a name="loadClamAv"></a>

## loadClamAv ⇒
Builds the ClamAV client at most once per process; the initialized instance
is reused for every scan. The connection is tested with a ping at init time
(`bypassTest: false`), so an unreachable daemon rejects here and every caller
maps that to `ServiceUnavailableException`. A rejected initialization is
dropped from the memoization cache, so the next call retries from scratch.

**Kind**: global constant  
**Returns**: The initialized ClamAV client.  
src: packages/backend/src/services/anti-virus.service.ts:45  
dist: packages/backend/dist/services/anti-virus.service.js:18
