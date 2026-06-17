import { Module } from '@nestjs/common';
import { AlertService } from './alert.service';
import { AlertResolver } from './alert.resolver';

@Module({
  providers: [AlertService, AlertResolver],
  exports: [AlertService],
})
export class AlertModule {}
