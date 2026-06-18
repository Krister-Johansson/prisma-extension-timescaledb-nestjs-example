import { Module } from '@nestjs/common';
import { ReadingModule } from '../reading/reading.module';
import { EmulatorResolver } from './emulator.resolver';
import { EmulatorService } from './emulator.service';

@Module({
  imports: [ReadingModule],
  providers: [EmulatorResolver, EmulatorService],
  exports: [EmulatorService],
})
export class EmulatorModule {}
