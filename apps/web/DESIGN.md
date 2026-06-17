# Frontend design brief

The prompt below is the source of truth for the `apps/web` demo UI. Paste it into
claude.ai/design (or any design/codegen tool) when generating or revising screens.

---

Build a static IoT sensor monitoring dashboard (React) — frontend only, no backend or API calls. Use realistic in-memory mock data (no GraphQL, no fetching). It's a visual demo of time-series + aggregated sensor data.

## Tech

- React + shadcn/ui (Tailwind). Use shadcn components: Card, Table, Badge, Tabs, Chart (recharts-based), Button, Select, Sidebar.
- Charts via shadcn Charts.
- Light + dark mode.

## Branding

- Primary color = **SAFETY ORANGE (#FF6700)**. Use it for the brand, primary buttons, active nav, key chart series, and accents.
- Status colors: green = OK, red = ALERTING (keep alert red visually distinct from the orange brand). Amber for warnings.

## Domain (mock data)

- Sensors of three types: TEMPERATURE (°C), PRESSURE (hPa), HUMIDITY (%). ~6 sensors with names like "Boiler temperature", "Line pressure", "Room humidity".
- For each sensor: a time-series of readings over the last 24h (e.g. one point every few minutes), hourly aggregates (per hour: avg, min, max, count), and an alert rule (threshold + clearThreshold/reset band + current state OK or ALERTING) with a short alert history (RAISED/CLEARED events).
- Bake all of this in as static sample data.

**Key requirement:** present the SAME data three ways — cards, tables, AND graphs — for both raw time-series and aggregated data.

## Pages (all static)

1. **Overview** — KPI summary cards (total sensors, active alerts, total data points, avg by type). A grid of sensor Cards: name, type icon, unit, latest value, OK/ALERTING badge, and a small sparkline.
2. **Sensor detail** — Tabs or sections showing:
   - a line GRAPH of raw readings (time-series) over 24h, with the alert threshold + reset band drawn as shaded zones;
   - an aggregated GRAPH (bar or line) of hourly avg/min/max;
   - a TABLE of recent raw readings (time, value);
   - a TABLE of hourly aggregates (hour, avg, min, max, count);
   - an alert-rule CARD (direction, threshold, clearThreshold, current state) + an alert-history TABLE.
3. **Aggregates** — cross-sensor aggregated view: summary CARDS (per-type averages, min/max), a GRAPH comparing hourly averages across sensors, and a TABLE of hourly buckets (sensor, hour, avg, min, max, count).
4. **System** — stat CARDS with mock storage metrics (total size, row count, total vs compressed chunks, compression ratio gauge).

## Design

Clean, modern monitoring dashboard; sidebar nav (Overview / Aggregates / System); responsive; empty/loading states for polish; safety-orange primary throughout; tables, cards, and charts all consistently styled with shadcn.

---

> Maps to the real backend API (`apps/api`) for when the demo is wired to live data:
> queries `sensors` / `sensorReadingsBucketed` / `sensorReadingsHourly` / `alertEvents` /
> `hypertableStats`, and subscriptions `readingIngested` / `alertFired`.
