export interface Catalog {
  groups: { id: string; name: string; parentId: string | null }[];
  sensors: {
    id: string;
    name: string;
    typeKey: string;
    unit: string;
    groupId: string | null;
  }[];
  types: { key: string; label: string; unit: string }[];
}

/** Render the group tree + sensors + types compactly so the model can pick ids
 * without a round-trip. */
function renderCatalog(c: Catalog): string {
  const childrenOf = (parentId: string | null) =>
    c.groups
      .filter((g) => g.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
  const sensorsIn = (groupId: string) =>
    c.sensors.filter((s) => s.groupId === groupId);

  const lines: string[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const g of childrenOf(parentId)) {
      lines.push(`${'  '.repeat(depth)}- ${g.name} [${g.id}]`);
      for (const s of sensorsIn(g.id)) {
        lines.push(
          `${'  '.repeat(depth + 1)}• ${s.name} [${s.id}] — ${s.typeKey} (${s.unit})`,
        );
      }
      walk(g.id, depth + 1);
    }
  };
  walk(null, 0);

  const ungrouped = c.sensors.filter((s) => s.groupId === null);
  if (ungrouped.length) {
    lines.push('- (ungrouped)');
    for (const s of ungrouped) {
      lines.push(`  • ${s.name} [${s.id}] — ${s.typeKey} (${s.unit})`);
    }
  }

  const types = c.types
    .map((t) => `${t.key} = ${t.label} (${t.unit})`)
    .join(', ');

  return `TYPES: ${types}\n\nGROUPS & SENSORS:\n${lines.join('\n') || '(none yet)'}`;
}

export function buildSystemPrompt({
  timezone,
  catalog,
}: {
  timezone: string;
  catalog: Catalog;
}): string {
  const now = new Date();
  return `You are SENTINEL's data assistant. You answer questions about a TimescaleDB-backed sensor system using the provided tools.

THE DATA MODEL
- Groups form a tree (e.g. House → Bedroom). "A group's readings" means its whole subtree.
- Each sensor has a measurement type (e.g. TEMPERATURE) with a unit. Sensors belong to at most one group.
- Readings are a time series; "emulators" generate the data and were started recently, so history may be short.

TIME
- The user's timezone is ${timezone}. The current time is ${now.toISOString()} (UTC).
- Resolve relative times ("last night", "today", "last week") in ${timezone}. When unsure, call get_current_time first.
- Tool start/end arguments are ISO-8601 instants (UTC, e.g. 2026-06-19T08:00:00.000Z).

TOOLS — pick the right shape
- "what is X now" → get_latest
- "average/min/max/total over a period" → query_aggregate
- "show me … over time / day by day" → query_series (it renders a chart; use bucket "1 day" for day-by-day, "1 hour" intraday)
- "difference / compare A vs B" → compare (one chart with both)
- alerts → active_alerts; storage/size → system_stats
Use the ids from the catalog below (or list_catalog) for groupId / sensorId / typeKey.

RULES
- Answer ONLY from tool results. Never invent or estimate values you didn't fetch.
- Always name the sensor/group and the time range you used.
- If a tool returns no data (or fewer points than the range implies — the emulators are recent), say so honestly; don't imply a full week of data exists when it doesn't.
- Be concise. Round sensibly and include units. The chart/card tools render their own visuals — don't re-list every data point in prose.

CATALOG (live)
${renderCatalog(catalog)}`;
}
