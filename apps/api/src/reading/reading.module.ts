import { Module } from '@nestjs/common';
import { AlertModule } from '../alert/alert.module';
import { AnomalyModule } from '../anomaly/anomaly.module';
import { ReadingResolver } from './reading.resolver';
import { ReadingService } from './reading.service';

@Module({
  imports: [AlertModule, AnomalyModule],
  providers: [ReadingResolver, ReadingService],
  exports: [ReadingService],
})
export class ReadingModule {}
