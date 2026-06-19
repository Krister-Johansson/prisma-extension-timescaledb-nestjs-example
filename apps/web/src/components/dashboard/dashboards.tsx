import { useMutation, useQuery } from '@apollo/client/react';
import { Lock, Plus, Unlock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AddWidgetDocument,
  CreateDashboardDocument,
  DashboardsDocument,
  DeleteDashboardDocument,
  DeleteWidgetDocument,
  UpdateDashboardDocument,
  UpdateWidgetLayoutDocument,
  type WidgetFieldsFragment,
} from '@/graphql/dashboards.generated';
import { DashboardGrid, type LayoutItem } from './dashboard-grid';
import { DashboardTabs } from './dashboard-tabs';
import { NameDialog } from './name-dialog';
import { SIZE_PRESETS, WIDGET_TYPES } from './widget-meta';

export function Dashboards() {
  const { data, loading } = useQuery(DashboardsDocument);
  const dashboards = data?.dashboards ?? [];

  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const active =
    dashboards.find((d) => d.slug === activeSlug) ?? dashboards[0] ?? null;
  // Keep the active slug pointed at a real dashboard as data loads/changes.
  useEffect(() => {
    if (active && active.slug !== activeSlug) setActiveSlug(active.slug);
  }, [active, activeSlug]);

  const refetchQueries = [{ query: DashboardsDocument }];
  const [createDashboard] = useMutation(CreateDashboardDocument, {
    refetchQueries,
  });
  const [updateDashboard] = useMutation(UpdateDashboardDocument);
  const [deleteDashboard] = useMutation(DeleteDashboardDocument, {
    refetchQueries,
  });
  const [addWidget] = useMutation(AddWidgetDocument, { refetchQueries });
  const [deleteWidget] = useMutation(DeleteWidgetDocument, { refetchQueries });
  const [updateWidgetLayout] = useMutation(UpdateWidgetLayoutDocument);

  const [dialog, setDialog] = useState<'create' | 'rename' | null>(null);

  const onCreate = async (name: string) => {
    const res = await createDashboard({ variables: { input: { name } } });
    const slug = res.data?.createDashboard.slug;
    if (slug) setActiveSlug(slug);
  };
  const onRename = (name: string) => {
    if (active) updateDashboard({ variables: { id: active.id, input: { name } } });
  };
  const onDelete = async () => {
    if (!active) return;
    const fallback = dashboards.find((d) => d.id !== active.id)?.slug ?? null;
    await deleteDashboard({ variables: { id: active.id } });
    setActiveSlug(fallback);
  };
  const toggleLock = () => {
    if (active)
      updateDashboard({
        variables: { id: active.id, input: { locked: !active.locked } },
      });
  };
  const onAddWidget = (type: string) => {
    if (!active) return;
    const { w, h } = SIZE_PRESETS[WIDGET_TYPES[type].defaultSize];
    // y at the bottom — vertical compaction pulls it up into place.
    addWidget({
      variables: { input: { dashboardId: active.id, type, x: 0, y: 9999, w, h } },
    });
  };
  const onRemoveWidget = (widget: WidgetFieldsFragment) =>
    deleteWidget({ variables: { id: widget.id } });
  const onPersist = (items: LayoutItem[]) =>
    updateWidgetLayout({ variables: { items } });
  const onConfigure = () =>
    toast('Widget configuration arrives in the next update.');

  if (loading && dashboards.length === 0) {
    return (
      <p className="p-2 text-sm text-muted-foreground">Loading dashboards…</p>
    );
  }

  if (dashboards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-border py-20 text-center">
        <p className="text-sm text-muted-foreground">No dashboards yet.</p>
        <Button onClick={() => setDialog('create')}>
          <Plus className="size-4" /> Create dashboard
        </Button>
        <NameDialog
          open={dialog === 'create'}
          onOpenChange={(o) => setDialog(o ? 'create' : null)}
          title="New dashboard"
          submitLabel="Create"
          onSubmit={onCreate}
        />
      </div>
    );
  }

  const locked = active?.locked ?? false;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 border-b border-border">
        <DashboardTabs
          dashboards={dashboards}
          activeSlug={active?.slug ?? null}
          onSelect={setActiveSlug}
          onCreate={() => setDialog('create')}
          onRename={() => setDialog('rename')}
          onDelete={onDelete}
        />
        <div className="flex shrink-0 items-center gap-1.5 pb-1">
          {!locked && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="size-4" /> Widget
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                {Object.entries(WIDGET_TYPES).map(([type, meta]) => (
                  <DropdownMenuItem key={type} onClick={() => onAddWidget(type)}>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm">{meta.label}</span>
                      <span className="text-[11px] text-muted-2">
                        {meta.description}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button size="sm" variant="outline" onClick={toggleLock}>
            {locked ? (
              <>
                <Lock className="size-3.5" /> Locked
              </>
            ) : (
              <>
                <Unlock className="size-3.5" /> Editing
              </>
            )}
          </Button>
        </div>
      </div>

      {active && active.widgets.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          {locked ? 'This dashboard is empty.' : 'Add a widget to get started.'}
        </div>
      ) : active ? (
        <DashboardGrid
          widgets={active.widgets}
          locked={locked}
          onPersist={onPersist}
          onConfigure={onConfigure}
          onRemove={onRemoveWidget}
        />
      ) : null}

      <NameDialog
        open={dialog === 'create'}
        onOpenChange={(o) => setDialog(o ? 'create' : null)}
        title="New dashboard"
        submitLabel="Create"
        onSubmit={onCreate}
      />
      <NameDialog
        open={dialog === 'rename'}
        onOpenChange={(o) => setDialog(o ? 'rename' : null)}
        title="Rename dashboard"
        initial={active?.name}
        submitLabel="Save"
        onSubmit={onRename}
      />
    </div>
  );
}
