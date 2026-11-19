<a name="TokenGate"></a>

## TokenGate(props) ⇒ <code>import(&quot;react&quot;).JSX.Element</code>
Shown when the backend refuses `/metrics`.

Two cases: 401 (the operator configured `METRICS_TOKEN`), where the user
enters that token once per tab; and 503 (production without `METRICS_TOKEN`),
which is a server misconfiguration the visitor cannot fix.

**Kind**: global function  
**Returns**: <code>import(&quot;react&quot;).JSX.Element</code> - The gate element.  

| Param | Type | Description |
| --- | --- | --- |
| props | <code>TokenGateProps</code> | Gate props. |
| props.reason |  | The HTTP status that led here (401 or 503). |
| props.onSubmit |  | Called with the entered token; the parent stores it and refetches. |

src: packages/dashboard/src/components/TokenGate.tsx:28  
