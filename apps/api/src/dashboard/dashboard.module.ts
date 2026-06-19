import { Module } from '@nestjs/common';
import { DashboardResolver } from './dashboard.resolver';
import { DashboardService } from './dashboard.service';

@Module({
  providers: [DashboardResolver, DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
