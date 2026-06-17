import { activeAlerts } from '@/data/alerts';
import { AlertActiveGrid } from './alert-active-grid';
import { TableEventLog } from './table-event-log';

export function Alerts() {
  const active = activeAlerts();
  return (
    <div className="flex flex-col gap-7">
      <section>
        <h2 className="mb-3.5 text-sm font-semibold">Active alerts</h2>
        <AlertActiveGrid sensors={active} />
      </section>
      <section>
        <h2 className="mb-3.5 text-sm font-semibold">Event log · last 24h</h2>
        <TableEventLog />
      </section>
    </div>
  );
}
