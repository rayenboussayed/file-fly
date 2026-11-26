<a name="metricsGate"></a>

## metricsGate(query) ⇒ <code>ReactElement&lt;unknown, string \| import(&quot;react&quot;).JSXElementConstructor&lt;any&gt;&gt;</code>
Shared loading/error gate for the metrics pages.

**Kind**: global function  
**Returns**: <code>ReactElement&lt;unknown, string \| import(&quot;react&quot;).JSXElementConstructor&lt;any&gt;&gt;</code> - The gate element, or undefined when data is available.  

| Param | Type | Description |
| --- | --- | --- |
| query | <code>import(&quot;@tanstack/react-query&quot;).UseQueryResult&lt;{ generatedAt: string; inFlight: number; last24h: { bucket: string; bytesIn: number; bytesOut: number; errors: number; requests: number; }[]; metricsDisabled: boolean; perIp: { [x: string]: unknown; bytesIn: number; bytesOut: number; filesIn: number; filesOut: number; ip: string; requests: number; }[]; perRoute: { [x: string]: unknown; avgMs: number; bytesOut: number; errors: number; p50: number; p95: number; p99: number; requests: number; route: string; }[]; today: { avgMs: number; bytesIn: number; bytesOut: number; cacheHitRate: number; cacheHits: number; cacheMisses: number; clientErrors: number; filesIn: number; filesOut: number; requests: number; scanBlocked: number; scanClean: number; scanInfected: number; serverErrors: number; }; totals: { avgMs: number; bytesIn: number; bytesOut: number; cacheHitRate: number; cacheHits: number; cacheMisses: number; clientErrors: number; filesIn: number; filesOut: number; requests: number; scanBlocked: number; scanClean: number; scanInfected: number; serverErrors: number; }; uptimeSeconds: number; }, Error&gt;</code> | The metrics query result. |

src: packages/dashboard/src/components/metrics-gate.tsx:16  
