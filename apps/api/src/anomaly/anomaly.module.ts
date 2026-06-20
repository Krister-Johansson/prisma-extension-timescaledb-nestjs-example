import { Module } from '@nestjs/common';
import { AnomalyResolver } from './anomaly.resolver';
import { AnomalyService } from './anomaly.service';

@Module({
  providers: [AnomalyService, AnomalyResolver],
  exports: [AnomalyService],
})
export class AnomalyModule {}
