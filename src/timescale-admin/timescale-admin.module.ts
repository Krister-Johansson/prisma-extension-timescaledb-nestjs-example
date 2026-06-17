import { Module } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { TimescaleAdminService } from './timescale-admin.service';
import { TimescaleAdminResolver } from './timescale-admin.resolver';

@Module({
  providers: [TimescaleAdminService, TimescaleAdminResolver, AdminGuard],
})
export class TimescaleAdminModule {}
