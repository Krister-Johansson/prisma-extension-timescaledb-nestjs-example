# MCP server — design

Expose the backend's management + read/analytics surface as **MCP tools** so an
MCP client (Claude Desktop/Code, etc.) can manage the demo and read data. Built
on [`@rekog/mcp-nest`](https://www.npmjs.com/package/@rekog/mcp-nest) — a NestJS
module where tools are `@Tool()` methods on injectable providers, so each tool is
a thin wrapper over the services we already have (via DI).

## Transport

Streamable HTTP, mounted on the existing Nest app → clients connect to
`http://localhost:3000/mcp`. No auth (local dev). A guard would slot in via
mcp-nest's `guards` option if this is ever exposed.

```jsonc
// example MCP client config
{ "mcpServers": { "sentinel": { "url": "http://localhost:3000/mcp" } } }
```

## Scope

Config **CRUD** + **read/analytics**. **No reading-ingestion tool** (per the
request) — the MCP never writes time-series data.

## Tools (one provider per domain, wrapping the mapped service)

### Sensors — `SensorService`
- `list_sensors` (optional typeKey / name filter) · `get_sensor`
- `create_sensor` (name, typeKey) · `update_sensor` (name) · `delete_sensor`

### Types — `SensorService` (+ new `updateType`/`deleteType`)
- `list_sensor_types`
- `create_sensor_type` (key, label, unit) · `update_sensor_type` (label, unit)
- `delete_sensor_type` — blocked if any sensor uses it (FK is RESTRICT)

### Groups — `GroupService`
- `list_groups` (flat list; parentId builds the tree) + per-group sensor counts
- `create_group` · `rename_group` · `move_group` (cycle-guarded) · `delete_group`
  (subgroups promote, sensors ungroup) · `assign_sensor_to_group`

### Alert rules — `AlertService`
- `list_alert_rules` (per sensor) · `create_alert_rule` · `update_alert_rule`
  · `delete_alert_rule`

### Emulators — `EmulatorService`
- `list_emulators` · `create_emulator` · `update_emulator`
  · `set_emulator_running` · `delete_emulator`

### Data / analytics (read-only, `annotations.readOnlyHint`)
- `readings_bucketed` (one sensor) · `readings_bucketed_multi` (several)
- `group_series` — aggregate overlay per (group subtree, type, agg)
- `readings_hourly` — the continuous aggregate
- `averages_by_type` — latest avg/min/max per type (the Overview KPI)
- `active_alerts` + `alert_events` — current alerts + the event log
- `hypertable_stats` — chunks / compression / size (the System page)

## Delivery (small CodeRabbit-reviewed PRs)
1. **Module + transport + plan** + sensors & types CRUD tools (this PR).
2. Groups + alert rules + emulators CRUD tools.
3. Read-only data / analytics tools.

## Notes
- Each domain module **exports its service** so the MCP tool providers can inject
  it; the MCP module imports those modules + `McpModule.forRoot`.
- Tool inputs are Zod schemas (mcp-nest validates them); mutations reuse the same
  service-layer validation as GraphQL.
