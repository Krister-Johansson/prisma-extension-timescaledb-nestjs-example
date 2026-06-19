import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { DashboardService } from './dashboard.service';
import {
  CreateDashboardInput,
  CreateWidgetInput,
  UpdateDashboardInput,
  UpdateWidgetInput,
  WidgetLayoutInput,
} from './dto/dashboard.inputs';
import { Dashboard, Widget } from './models/dashboard.model';

@Resolver(() => Dashboard)
export class DashboardResolver {
  constructor(private readonly service: DashboardService) {}

  @Query(() => [Dashboard])
  dashboards() {
    return this.service.findMany();
  }

  @Query(() => Dashboard, { nullable: true })
  dashboard(@Args('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  @Mutation(() => Dashboard)
  createDashboard(@Args('input') input: CreateDashboardInput) {
    return this.service.create(input);
  }

  @Mutation(() => Dashboard)
  updateDashboard(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateDashboardInput,
  ) {
    return this.service.update(id, input);
  }

  @Mutation(() => Boolean)
  deleteDashboard(@Args('id', { type: () => ID }) id: string) {
    return this.service.remove(id);
  }

  @Mutation(() => [Dashboard])
  reorderDashboards(@Args('ids', { type: () => [ID] }) ids: string[]) {
    return this.service.reorder(ids);
  }

  @Mutation(() => Widget)
  addWidget(@Args('input') input: CreateWidgetInput) {
    return this.service.addWidget(input);
  }

  @Mutation(() => Widget)
  updateWidget(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateWidgetInput,
  ) {
    return this.service.updateWidget(id, input);
  }

  @Mutation(() => Boolean)
  deleteWidget(@Args('id', { type: () => ID }) id: string) {
    return this.service.removeWidget(id);
  }

  @Mutation(() => Boolean)
  updateWidgetLayout(
    @Args('items', { type: () => [WidgetLayoutInput] })
    items: WidgetLayoutInput[],
  ) {
    return this.service.updateLayout(items);
  }
}
