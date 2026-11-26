import type { QueryClient } from '@tanstack/react-query';

import { AppShell } from '@astryxdesign/core/AppShell';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { TopNav, TopNavHeading } from '@astryxdesign/core/TopNav';
import { VStack } from '@astryxdesign/core/VStack';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';

/**
Router context: the React Query client (shared fetch cache for the app).
 */
export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFound,
});

/**
 * Fallback for unknown paths.
 * @returns The not-found element.
 */
function NotFound() {
  return (
    <VStack gap={2}>
      <Heading level={2}>Page not found</Heading>
      <Link href="/">Back to overview</Link>
    </VStack>
  );
}

/**
 * Root layout: the app shell with the top navigation and routed content.
 * @returns The shell element.
 */
function RootComponent() {
  return (
    <AppShell
      contentPadding={4}
      topNav={
        <TopNav
          heading={<TopNavHeading heading="file-fly" headingHref="/" />}
          label="file-fly navigation"
        />
      }
    >
      <Outlet />
    </AppShell>
  );
}
