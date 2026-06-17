import { Module } from '@nestjs/common';
import { SensorResolver } from './sensor.resolver';
import { SensorService } from './sensor.service';

@Module({
  providers: [SensorResolver, SensorService],
})
export class SensorModule {}
