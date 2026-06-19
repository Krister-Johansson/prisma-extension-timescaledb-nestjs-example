import { Module } from '@nestjs/common';
import { AlertModule } from '../alert/alert.module';
import { EmulatorModule } from '../emulator/emulator.module';
import { GroupModule } from '../group/group.module';
import { ReadingModule } from '../reading/reading.module';
import { SensorModule } from '../sensor/sensor.module';
import { TimescaleAdminModule } from '../timescale-admin/timescale-admin.module';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';

/** The AI chat agent — tools over the existing services + an OpenRouter-backed
 * model loop. Registered only when an OpenRouter key is set (see AppModule). */
@Module({
  imports: [
    SensorModule,
    ReadingModule,
    AlertModule,
    GroupModule,
    TimescaleAdminModule,
    EmulatorModule,
  ],
  providers: [AgentService],
  controllers: [AgentController],
})
export class AgentModule {}
