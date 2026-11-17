import { createFileRoute } from '@tanstack/react-router';

import { OverviewPage } from '../components/OverviewPage.js';

export const Route = createFileRoute('/')({ component: OverviewPage });
