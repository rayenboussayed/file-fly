## Functions

<dl>
<dt><a href="#record">record(overrides)</a> ⇒ <code>MetricsRecord</code></dt>
<dd><p>Convenience record with overridable fields.</p>
</dd>
<dt><a href="#indexNames">indexNames(dbPath)</a> ⇒ <code>string[]</code></dt>
<dd><p>Lists the hot-path indexes present in a metrics database.</p>
</dd>
<dt><a href="#queryPlan">queryPlan(dbPath, sql)</a> ⇒ <code>string[]</code></dt>
<dd><p>Returns the plan detail lines for a statement against a temporary store.</p>
</dd>
</dl>

<a name="record"></a>

## record(overrides) ⇒ <code>MetricsRecord</code>
Convenience record with overridable fields.

**Kind**: global function  
**Returns**: <code>MetricsRecord</code> - A fully-populated record with defaults applied.  

| Param | Type | Description |
| --- | --- | --- |
| overrides | <code>Partial&lt;MetricsRecord&gt;</code> | Fields to override in the fixture record. |

src: packages/backend/src/metrics/metrics.service.spec.ts:28  
<a name="indexNames"></a>

## indexNames(dbPath) ⇒ <code>string[]</code>
Lists the hot-path indexes present in a metrics database.

**Kind**: global function  
**Returns**: <code>string[]</code> - The names of the indexes created by the service.  

| Param | Type | Description |
| --- | --- | --- |
| dbPath | <code>string</code> | Path to the temporary test database. |

src: packages/backend/src/metrics/metrics.service.spec.ts:53  
<a name="queryPlan"></a>

## queryPlan(dbPath, sql) ⇒ <code>string[]</code>
Returns the plan detail lines for a statement against a temporary store.

**Kind**: global function  
**Returns**: <code>string[]</code> - The plan detail lines, in SQLite's order.  

| Param | Type | Description |
| --- | --- | --- |
| dbPath | <code>string</code> | Path to the temporary test database. |
| sql | <code>string</code> | Statement to explain. |

src: packages/backend/src/metrics/metrics.service.spec.ts:79  
