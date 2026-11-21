<a name="MetricsErrorState"></a>

## MetricsErrorState(props) ⇒ <code>import(&quot;react&quot;).JSX.Element</code>
Renders the failure state shared by both metrics pages.

**Kind**: global function  
**Returns**: <code>import(&quot;react&quot;).JSX.Element</code> - The token gate or a generic error card.  

| Param | Type | Description |
| --- | --- | --- |
| props | <code>MetricsErrorStateProps</code> | Component props. |
| props.error |  | The query error, checked for an HTTP status. |
| props.onRefetch |  | Retries the query after a token is stored. |

src: packages/dashboard/src/components/MetricsErrorState.tsx:23  
