import { Module } from '@nestjs/common';

import { DashboardStaticService } from './dashboard-static.service.js';

/** Serves the built dashboard (DASHBOARD_DIR, packages/dashboard/dist) as static assets. */
@Module({
  providers: [DashboardStaticService],
})
export class DashboardStaticModule {}
