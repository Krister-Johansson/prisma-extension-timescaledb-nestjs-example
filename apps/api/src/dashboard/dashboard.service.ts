import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PRISMA_CLIENT } from '../prisma/prisma-client';
import type { ExtendedPrismaClient } from '../prisma/prisma-client';
import type {
  CreateDashboardInput,
  CreateWidgetInput,
  UpdateDashboardInput,
  UpdateWidgetInput,
  WidgetLayoutInput,
} from './dto/dashboard.inputs';

const withWidgets = {
  include: { widgets: { orderBy: { createdAt: 'asc' as const } } },
};

@Injectable()
export class DashboardService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient,
  ) {}

  findMany() {
    return this.prisma.dashboard.findMany({
      // createdAt breaks position ties so tab order is deterministic even if two
      // dashboards momentarily share a position.
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      ...withWidgets,
    });
  }

  findBySlug(slug: string) {
    return this.prisma.dashboard.findUnique({
      where: { slug },
      ...withWidgets,
    });
  }

  async create(input: CreateDashboardInput) {
    // The slug unique index is the source of truth; if a concurrent create grabs
    // the same slug we just lose the race (P2002) and retry with a fresh suffix.
    // Position ties are harmless thanks to the createdAt tiebreaker in findMany.
    for (let attempt = 0; ; attempt++) {
      const slug = await this.uniqueSlug(input.name);
      const max = await this.prisma.dashboard.aggregate({
        _max: { position: true },
      });
      try {
        return await this.prisma.dashboard.create({
          data: {
            name: input.name,
            slug,
            position: (max._max.position ?? -1) + 1,
          },
          ...withWidgets,
        });
      } catch (error) {
        if (
          attempt < 4 &&
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }
    }
  }

  update(id: string, input: UpdateDashboardInput) {
    return this.prisma.dashboard.update({
      where: { id },
      data: { name: input.name, locked: input.locked },
      ...withWidgets,
    });
  }

  async remove(id: string): Promise<boolean> {
    await this.prisma.dashboard.delete({ where: { id } });
    return true;
  }

  /** Persist a new tab order — `ids` in the desired order. */
  async reorder(ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, position) =>
        this.prisma.dashboard.update({ where: { id }, data: { position } }),
      ),
    );
    return this.findMany();
  }

  addWidget(input: CreateWidgetInput) {
    return this.prisma.widget.create({
      data: {
        dashboardId: input.dashboardId,
        type: input.type,
        x: input.x ?? 0,
        y: input.y ?? 0,
        w: input.w ?? 4,
        h: input.h ?? 3,
        config: (input.config ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  updateWidget(id: string, input: UpdateWidgetInput) {
    return this.prisma.widget.update({
      where: { id },
      data: {
        x: input.x,
        y: input.y,
        w: input.w,
        h: input.h,
        // Treat null like "unchanged" — Widget.config is non-null (JSON!), so we
        // never persist null; an explicit reset should send {}.
        config:
          input.config == null
            ? undefined
            : (input.config as Prisma.InputJsonValue),
      },
    });
  }

  async removeWidget(id: string): Promise<boolean> {
    await this.prisma.widget.delete({ where: { id } });
    return true;
  }

  /** Persist a drag/resize: update every moved widget's x/y/w/h in one txn. */
  async updateLayout(items: WidgetLayoutInput[]): Promise<boolean> {
    await this.prisma.$transaction(
      items.map((it) =>
        this.prisma.widget.update({
          where: { id: it.id },
          data: { x: it.x, y: it.y, w: it.w, h: it.h },
        }),
      ),
    );
    return true;
  }

  /** A URL-safe, unique slug derived from the name (handles collisions). */
  private async uniqueSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) || 'dashboard';
    for (let n = 0; ; n++) {
      const slug = n === 0 ? base : `${base}-${n + 1}`;
      const existing = await this.prisma.dashboard.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!existing) return slug;
    }
  }

  async requireBySlug(slug: string) {
    const d = await this.findBySlug(slug);
    if (!d) throw new NotFoundException(`No dashboard "${slug}"`);
    return d;
  }
}
