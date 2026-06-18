import { Module } from '@nestjs/common';
import { SensorResolver, SensorTypeResolver } from './sensor.resolver';
import { SensorService } from './sensor.service';

@Module({
  providers: [SensorResolver, SensorTypeResolver, SensorService],
  exports: [SensorService],
})
export class SensorModule {}
