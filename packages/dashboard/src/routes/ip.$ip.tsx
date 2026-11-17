import { createFileRoute } from '@tanstack/react-router';

import { IpDetailPage } from '../components/IpDetailPage.js';

export const Route = createFileRoute('/ip/$ip')({
  component: RouteComponent,
});

/**
 *
 */
/**
 * Reads the route param and renders the IP detail page.
 * @returns The IP detail page element.
 */
function RouteComponent() {
  const { ip } = Route.useParams();
  return <IpDetailPage ip={decodeURIComponent(ip)} />;
}
