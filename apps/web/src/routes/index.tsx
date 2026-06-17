import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <main className="mx-auto max-w-2xl p-16">
      <span className="inline-block rounded-full border border-brand px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
        TanStack Router
      </span>
      <h1 className="mt-3 text-3xl font-bold">
        Sensor Dashboard <span className="text-brand">demo</span>
      </h1>
      <p className="mt-4 text-slate-600">
        Frontend scaffold for the <code>prisma-extension-timescaledb</code>{' '}
        monorepo. The dashboard UI (sensors, time-series, aggregates, alerts) is
        generated from the brief in <code>apps/web/DESIGN.md</code>.
      </p>
    </main>
  );
}
