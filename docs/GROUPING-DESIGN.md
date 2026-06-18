# Sensor grouping + aggregate overlays — design

Research + decisions for: a nested group tree under Manage, attaching sensors to
groups, and group-based filtering / multi-series overlays on Aggregates.

Status: **living doc, written autonomously.** Items marked **🟡 DECISION** are
choices I made a sensible default on and want confirmed — they're cheap to change.

---

## 1. Group tree storage — **adjacency list** ✅

`SensorGroup { id, name, parentId?, createdAt }` — a nullable self-FK. Root
groups have `parentId = null`. Children via a Prisma self-relation
(`@relation("GroupTree")`). **No depth limit.**

- **Subtree / descendants**: a Postgres `WITH RECURSIVE` CTE (via `$queryRaw`).
- **Move a node**: just update `parentId` (O(1)).
- **Alternatives considered & rejected for this use case**:
  - *Materialized path* (`/root/floor/room`): fast subtree via `LIKE`, but a move
    rewrites every descendant's path.
  - *Nested sets* (lft/rgt): fast reads, expensive/locky writes.
  - *Closure table*: flexible but an extra table + write amplification.
  - *ltree* (PG extension): powerful but adds an extension dependency.
  - Adjacency list + recursive CTE is the simplest thing that fits a UI tree with
    frequent edits and "all sensors under X" queries.

**🟡 DECISION:** sibling groups may share a name (no unique constraint); identity
is the id. Easy to add a `@@unique([parentId, name])` later if you want.

## 2. Sensor ↔ group — **one group per sensor (nullable)** ✅

`Sensor.groupId?` → `SensorGroup`. A sensor lives in one place (a room).
Ungrouped sensors are allowed (`groupId = null`).

"All sensors under group X" = sensors whose `groupId ∈ {X} ∪ descendants(X)`.

**🟡 DECISION:** one group per sensor, not many-to-many. A sensor is physically in
one location; the tree gives the hierarchy. If you later want a sensor in several
logical groups, this becomes a join table — but that complicates "avg across a
group" (double-counting), so one-group is the right default.

## 3. Delete + move semantics

- **Delete a group**: reparent its direct children to the deleted node's parent
  and move its sensors to that parent (or `null` if deleting a root). Done in one
  transaction. No data/subtree is lost. **🟡 DECISION** — alternative is cascade
  (delete the whole subtree + unassign sensors) or block-if-non-empty.
- **Move a group**: reject moving a node under itself or one of its descendants
  (cycle guard) via the descendant CTE.

## 4. Group-based aggregation (Aggregates)

### 4a. Filter by group
Pick a group in the tree → the compare chart shows only sensors in that subtree
(optionally further filtered by type). Reuses the sensor-filter plumbing.

### 4b. Multi-series overlay — the interesting one
The user wants to overlay **defined aggregate series**, not just per-sensor lines.
Example: *"last week's avg temp on upper floor + lower floor, and the house avg
humidity"* — 3 series, each an aggregate over a (group-subtree, sensor-type).

**Series spec** = `{ groupId, type: SensorType | ALL, agg: AVG | MIN | MAX }`.
Backend resolves matching sensors (subtree + type) and aggregates **across them**
per time bucket:

```sql
WITH RECURSIVE sub AS (
  SELECT id FROM "SensorGroup" WHERE id = $group
  UNION ALL
  SELECT g.id FROM "SensorGroup" g JOIN sub ON g."parentId" = sub.id
)
SELECT time_bucket($bucket::interval, r."time") AS bucket,
       avg(r.value) AS value          -- or min()/max()
FROM "SensorReading" r
JOIN "Sensor" s ON s.id = r."sensorId"
WHERE s."groupId" IN (SELECT id FROM sub)
  AND ($type IS NULL OR s.type = $type)
  AND r."time" >= $start AND r."time" < $end
GROUP BY bucket ORDER BY bucket;
```

- **Backend**: `groupSeries(specs: [SeriesSpecInput!]!, bucket, start, end)` →
  returns each spec's bucketed series in one round trip (loop the CTE per spec, or
  a single CTE with `UNION ALL` tagging each spec). One query is preferable.
- **Frontend overlay UX**: an editable list of series rows — *Group ▾ · Type ▾ ·
  Agg ▾* — each with a color + auto label ("Upper floor · Temp · avg"). All series
  stored in the URL (shareable). Units differ across series, so the **scale toggle**
  (per-unit axes ↔ normalized) from the aggregates chart handles mixed units.

### 4c. Period-over-period ("last week's …") — **🟡 OPEN, needs your input**
Overlaying *last week's* avg vs *this week's* is a per-series **time shift**: pull
each series over a window offset back by N (e.g. −7 days) and plot it aligned to
the current axis. This is real UX work:
- How do you specify the offset per series? (a "compare to: −1 week / −1 day /
  custom" picker?)
- Axis alignment: overlay by *relative* time (hour-of-week) so this-week and
  last-week line up?

**Plan:** ship the overlay **without** offsets first (covers "avg temp upper floor
+ lower floor + house humidity"). Add period-shift as a follow-up once you confirm
the offset UX. Logged so we can pick it up.

## 5. Build order
1. Grouping backend: `SensorGroup` tree + `Sensor.groupId` + CRUD + descendants CTE (hand-written migration — `migrate dev` is blocked here).
2. Manage: group tree UI (create/rename/move/delete, attach sensors).
3. Aggregates: filter by group.
4. Aggregates: multi-series overlay (no offset).
5. (later) period-over-period offsets — pending UX decision in 4c.

Independently, two smaller aggregates-chart items are already queued: a sensor
multi-select filter and the real-values↔normalized scale toggle.
