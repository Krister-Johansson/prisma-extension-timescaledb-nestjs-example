import { Module } from '@nestjs/common';
import { AlertModule } from '../alert/alert.module';
import { ReadingResolver } from './reading.resolver';
import { ReadingService } from './reading.service';

@Module({
  imports: [AlertModule],
  providers: [ReadingResolver, ReadingService],
})
export class ReadingModule {}
