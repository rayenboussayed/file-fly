import { createFileRoute } from '@tanstack/react-router';

import { OverviewPage } from '../components/OverviewPage.js';

/** File-based route for the overview page. */
export const Route = createFileRoute('/')({ component: OverviewPage });
