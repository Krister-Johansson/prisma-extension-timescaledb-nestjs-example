import { Module } from '@nestjs/common';
import { TimescaleAdminService } from './timescale-admin.service';
import { TimescaleAdminResolver } from './timescale-admin.resolver';

@Module({
  providers: [TimescaleAdminService, TimescaleAdminResolver],
  exports: [TimescaleAdminService],
})
export class TimescaleAdminModule {}
