import { Module } from '@nestjs/common';
import { ReadingResolver } from './reading.resolver';
import { ReadingService } from './reading.service';

@Module({
  providers: [ReadingResolver, ReadingService],
})
export class ReadingModule {}
