<a name="MetricsErrorState"></a>

## MetricsErrorState(properties) ⇒ <code>import(&quot;react&quot;).JSX.Element</code>
Renders the failure state shared by both metrics pages.

**Kind**: global function  
**Returns**: <code>import(&quot;react&quot;).JSX.Element</code> - The token gate or a generic error card.  

| Param | Type | Description |
| --- | --- | --- |
| properties | <code>MetricsErrorStateProperties</code> | Component props. |
| properties.error |  | The query error, checked for an HTTP status. |
| properties.onRefetch |  | Retries the query after a token is stored. |

src: packages/dashboard/src/components/metrics-error-state.tsx:29  
