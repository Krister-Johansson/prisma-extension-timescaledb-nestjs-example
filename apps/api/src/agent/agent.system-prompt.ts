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

/** Strip control chars + newlines and cap length so a user-controlled name
 * (sensor/group/type) can't smuggle extra "instructions" into the prompt. */
function clean(s: string): string {
  // Drop control chars (incl. newlines), collapse whitespace, cap length — a
  // user-controlled name must not be able to inject extra prompt instructions.
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    out += code < 0x20 || code === 0x7f ? ' ' : ch;
  }
  return out.replace(/\s+/g, ' ').trim().slice(0, 100);
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
      lines.push(`${'  '.repeat(depth)}- ${clean(g.name)} [${g.id}]`);
      for (const s of sensorsIn(g.id)) {
        lines.push(
          `${'  '.repeat(depth + 1)}• ${clean(s.name)} [${s.id}] — ${clean(s.typeKey)} (${clean(s.unit)})`,
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
      lines.push(
        `  • ${clean(s.name)} [${s.id}] — ${clean(s.typeKey)} (${clean(s.unit)})`,
      );
    }
  }

  const types = c.types
    .map((t) => `${clean(t.key)} = ${clean(t.label)} (${clean(t.unit)})`)
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
  return `You are SENTINEL's assistant for a TimescaleDB-backed sensor system. You answer questions about the data AND make changes (create sensors, groups, types, emulators) when the user asks — all through the provided tools.

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
- alerts → active_alerts; storage/size → system_stats; emulators → list_emulators
Use the ids from the catalog below (or list_catalog) for groupId / sensorId / typeKey. Emulator ids come from list_emulators (call it before rename/move/start/stop of an emulator).

MAKING CHANGES — you CAN modify the system
- Tools: create_sensor, create_group, rename_group, move_group, assign_sensor_to_group, create_sensor_type, create_emulator, set_emulator_running. (There are no delete tools.)
- When the user asks to create/rename/move/assign/start something, CALL the matching tool. Never reply that you "can't" or that they should use the admin UI — you can, via these tools.
- Each change is **confirmation-gated**: calling the tool shows the user a Confirm/Cancel card before anything runs, so it's safe to call. Don't ask "should I?" in text — just call it and let them confirm. If they decline, acknowledge and stop.
- Resolve names to ids first (from the catalog). Only do what they asked; don't chain extra changes they didn't request.

RULES
- Answer ONLY from tool results. Never invent or estimate values you didn't fetch.
- Always name the sensor/group and the time range you used.
- If a tool returns no data (or fewer points than the range implies — the emulators are recent), say so honestly; don't imply a full week of data exists when it doesn't.
- Be concise. Round sensibly and include units. The chart/card tools render their own visuals — don't re-list every data point in prose.

CATALOG (live)
${renderCatalog(catalog)}`;
}
