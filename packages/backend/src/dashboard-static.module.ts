import { Module } from '@nestjs/common';

import { DashboardStaticService } from './dashboard-static.service.js';

/** Dashboard static serving module; the only provider is the static service. */
@Module({
  providers: [DashboardStaticService],
})
export class DashboardStaticModule {}
