import {
  BarChart3,
  Bell,
  LayoutDashboard,
  Radar,
  Radio,
  Server,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { AppLink } from '@/components/app-link';
import { routes, type RoutePath } from '@/lib/routes';

interface NavItem {
  label: string;
  to: RoutePath;
  icon: LucideIcon;
  exact?: boolean;
}

const NAV: NavItem[] = [
  {
    label: 'Dashboards',
    to: routes.overview(),
    icon: LayoutDashboard,
    exact: true,
  },
  { label: 'Alerts', to: routes.alerts(), icon: Bell },
  { label: 'Anomalies', to: routes.anomalies(), icon: Radar },
  { label: 'Aggregates', to: routes.aggregates(), icon: BarChart3 },
  { label: 'System', to: routes.system(), icon: Server },
  { label: 'Manage', to: routes.manage(), icon: SlidersHorizontal },
  { label: 'Emulators', to: routes.emulators(), icon: Radio },
];

export function AppSidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-62 flex-none flex-col border-r border-border bg-sidebar">
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <div className="flex size-9 flex-none items-center justify-center rounded-[9px] bg-primary shadow-[0_2px_8px_color-mix(in_srgb,var(--primary)_40%,transparent)]">
          <div className="size-3 rounded-[3px] bg-white" />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-bold tracking-tight">SENTINEL</div>
          <div className="text-[11px] text-muted-foreground">IoT Monitoring</div>
        </div>
      </div>

      <div className="px-5 pb-2 pt-2 font-mono text-[10.5px] font-semibold tracking-[0.12em] text-muted-2">
        NAVIGATION
      </div>
      <nav className="flex flex-col gap-[3px] px-3">
        {NAV.map(({ label, to, icon: Icon, exact }) => (
          <AppLink
            key={to}
            to={to}
            activeOptions={{ exact: exact ?? false }}
            className="relative flex items-center gap-3 rounded-[9px] px-3 py-2 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-surface-2 data-[status=active]:text-foreground data-[status=active]:before:absolute data-[status=active]:before:left-0 data-[status=active]:before:top-2 data-[status=active]:before:bottom-2 data-[status=active]:before:w-[3px] data-[status=active]:before:rounded-r data-[status=active]:before:bg-primary"
          >
            <Icon className="size-[17px]" />
            <span>{label}</span>
          </AppLink>
        ))}
      </nav>
    </aside>
  );
}
