import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateEmulatorInput } from './dto/create-emulator.input';
import { EmulatorService } from './emulator.service';
import { Emulator } from './models/emulator.model';

@Resolver(() => Emulator)
export class EmulatorResolver {
  constructor(private readonly emulatorService: EmulatorService) {}

  @Query(() => [Emulator], { name: 'emulators' })
  emulators(): Promise<Emulator[]> {
    return this.emulatorService.list();
  }

  @Mutation(() => Emulator)
  createEmulator(@Args('input') input: CreateEmulatorInput): Promise<Emulator> {
    return this.emulatorService.create(input);
  }

  @Mutation(() => Emulator)
  setEmulatorRunning(
    @Args('id', { type: () => ID }) id: string,
    @Args('running') running: boolean,
  ): Promise<Emulator> {
    return this.emulatorService.setRunning(id, running);
  }

  /** Returns the deleted emulator so clients can evict it from their cache. */
  @Mutation(() => Emulator)
  deleteEmulator(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Emulator> {
    return this.emulatorService.remove(id);
  }
}
