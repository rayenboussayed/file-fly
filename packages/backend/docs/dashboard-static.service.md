## Members

<dl>
<dt><a href="#DashboardStaticService">DashboardStaticService</a></dt>
<dd><p>Serves the prebuilt dashboard at <code>/</code> when its build output exists.</p>
<p><code>wildcard: false</code> registers each built file as its own exact route, so the
API routes are never shadowed and only files that exist in the dist folder
are served. Deep client routes are served via <code>CLIENT_ROUTE_ALIASES</code>.
Everything else falls through to Nest&#39;s own 404 handler unchanged. A
missing dist folder logs a warning and serves no dashboard.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#CLIENT_ROUTE_ALIASES">CLIENT_ROUTE_ALIASES</a></dt>
<dd><p>Client routes of the SPA that do not map to a file in the build output and
therefore need an explicit alias to <code>index.html</code>. Keep this in sync with
<code>packages/dashboard/src/routes/</code> (currently <code>/</code> and <code>/ip/:ip</code>). The build&#39;s
index.html itself is served at <code>/</code> by the static plugin.</p>
</dd>
</dl>

<a name="DashboardStaticService"></a>

## DashboardStaticService
Serves the prebuilt dashboard at `/` when its build output exists.

`wildcard: false` registers each built file as its own exact route, so the
API routes are never shadowed and only files that exist in the dist folder
are served. Deep client routes are served via `CLIENT_ROUTE_ALIASES`.
Everything else falls through to Nest's own 404 handler unchanged. A
missing dist folder logs a warning and serves no dashboard.

**Kind**: global variable  
src: packages/backend/src/dashboard-static.service.ts:28  
dist: packages/backend/dist/dashboard-static.service.js:18
<a name="DashboardStaticService+onApplicationBootstrap"></a>

### dashboardStaticService.onApplicationBootstrap() ⇒ <code>Promise&lt;void&gt;</code>
Registers the static routes and the deep-link aliases.

**Kind**: instance method of [<code>DashboardStaticService</code>](#DashboardStaticService)  
**Returns**: <code>Promise&lt;void&gt;</code> - Nothing.  
src: packages/backend/src/dashboard-static.service.ts:37  
dist: packages/backend/dist/dashboard-static.service.js:24
<a name="CLIENT_ROUTE_ALIASES"></a>

## CLIENT\_ROUTE\_ALIASES
Client routes of the SPA that do not map to a file in the build output and
therefore need an explicit alias to `index.html`. Keep this in sync with
`packages/dashboard/src/routes/` (currently `/` and `/ip/:ip`). The build's
index.html itself is served at `/` by the static plugin.

**Kind**: global constant  
src: packages/backend/src/dashboard-static.service.ts:16  
dist: packages/backend/dist/dashboard-static.service.js:17
