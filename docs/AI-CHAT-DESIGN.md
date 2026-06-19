# AI chat agent — design

An AI assistant in the SENTINEL app: a floating button (bottom-right) opens a
chat where you ask questions about your sensor data in natural language and get
back **text + rich UI elements** (charts and cards), not just prose.

Example questions (the target):
- *"What's the temperature in the bedroom?"* → a value card
- *"What was the average temp last night?"* → a number + the night's range
- *"What's the temperature difference between the bedrooms?"* → a comparison
- *"Show me the temperature last week, day by day."* → a line/bar chart

Stack (researched via Context7):
- **[TanStack AI](https://tanstack.com/ai)** — `@tanstack/ai-react` (`useChat`),
  `@tanstack/ai-client`, and the framework-agnostic server runtime. Type-safe
  tools, streaming, message **parts** (text / thinking / tool-call / tool-result
  / structured-output), provider-agnostic adapters. Speaks the **AG-UI** SSE
  protocol between client and server.
- **[OpenRouter](https://openrouter.ai)** — one OpenAI-compatible endpoint
  (`https://openrouter.ai/api/v1`) for the model. Standard `tools` function
  calling + a `reasoning` parameter for extended thinking.

---

## 1. Model recommendation (thinking + tool calling)

The job is **agentic tool-calling with reasoning** over our data. Claude is the
strongest tool-caller and supports extended/adaptive thinking, so:

**Chosen: Opus** (max quality) — `anthropic/claude-opus-4.x` (the latest
`anthropic/claude-opus-*` your OpenRouter account lists). Deepest reasoning +
top-tier tool calling.

| Tier | OpenRouter model id | ~Price (in/out per 1M) | Notes |
|---|---|---|---|
| **Chosen — Opus** | `anthropic/claude-opus-4.x` | ~$5 / $25+ | Deepest reasoning; what we'll use |
| Sonnet | `anthropic/claude-sonnet-4.5` | ~$3 / $15 | Cheaper fallback if cost bites |
| Haiku | `anthropic/claude-haiku-4.5` | ~$1 / $5 | Simple lookups |

> The model is an **env var** (`OPENROUTER_MODEL`, default the latest Opus) so
> switching tiers is a one-line change. OpenRouter's catalog can lag first-party
> by a version — pick the latest Opus listed in your account.

**How thinking + tool use interact (OpenRouter + Claude):**
- Enable thinking with `reasoning: { effort: "high" }` **or** `reasoning: { max_tokens: N }`.
- On the **newest adaptive-thinking Claude** (e.g. Opus 4.7+), `effort`/`max_tokens`
  are **ignored** — adaptive thinking is on by default once `reasoning` is enabled.
  On Sonnet 4.5 you can tune `effort`/`max_tokens`.
- The model **thinks, then emits tool calls**, and **interleaves thinking between
  tool calls** — exactly what we want for "look up sensors → query readings →
  compute → answer". Reasoning streams as `reasoning_details`; final text as
  `content`.
- **Billing:** reasoning tokens count as **output tokens**. Set `max_tokens`
  comfortably above the reasoning budget.
- **Fallbacks:** OpenRouter accepts a `models: [...]` list for automatic failover.

---

## 2. Architecture — where everything runs

The OpenRouter API key must never reach the browser, and the data tools need DB
access, so the **agent loop runs in the NestJS backend**:

```
┌── apps/web (React/Vite) ───────────────┐      ┌── apps/api (NestJS) ─────────────────┐
│ AiLauncher (bottom-right FAB)          │      │ POST /agent/chat  (SSE, AG-UI)       │
│ AiChatPanel                            │ SSE  │  TanStack AI server runtime          │
│  useChat({ connection:                 │◀────▶│   ├─ OpenRouter provider (key in env)│
│    fetchServerSentEvents('/agent/chat')│      │   ├─ system prompt + data catalog    │
│  })                                    │      │   └─ READ-ONLY tools ───┐            │
│  renders message.parts:                │      │                         ▼            │
│   • text    → markdown                 │      │   ReadingService / GroupService /    │
│   • thinking→ collapsible              │      │   SensorService / AlertService /     │
│   • tool-*  → <ChartCard>/<StatCard>/… │      │   TimescaleAdminService (existing)   │
└────────────────────────────────────────┘      └──────────────────────────────────────┘
```

- The tools are the **same service layer** the GraphQL resolvers and the MCP
  tools already wrap — see [[mcp-server]]. We're adding a third consumer.
- The endpoint streams the **AG-UI** SSE protocol that `useChat` consumes.
  > ⚠️ **Integration spike (Phase 0):** confirm the `@tanstack/ai` server runtime
  > streams cleanly from a Nest controller (Express `res`, `text/event-stream`).
  > TanStack AI is new; if the Nest wiring is awkward, the fallback is to drive
  > OpenRouter with the OpenAI SDK and emit the AG-UI events ourselves.

---

## 3. The headline: UI elements in the chat (generative UI)

TanStack AI messages are a list of **parts**; we render each part type to a
component. The clean pattern for charts/cards is **tool-result-driven generative
UI**: a tool returns chart/card-shaped JSON, and the client maps the tool name →
a React component.

```tsx
message.parts.map((part) => {
  if (part.type === 'text')     return <Markdown text={part.content} />
  if (part.type === 'thinking') return <ThinkingDisclosure text={part.content} />
  if (part.type === 'tool-call')   return <ToolStatus part={part} />   // "Querying readings…"
  if (part.type === 'tool-result') return renderToolResult(part)        // ← the UI elements
})
```

`renderToolResult` is a **registry** keyed by tool name:

| Tool result | Component |
|---|---|
| `query_series` (bucketed time series) | `<SeriesChart>` (Recharts line/bar — reuse the aggregates chart bits) |
| `compare` (multi-series) | `<CompareChart>` (reuse the overlay chart) |
| `get_latest` (current values) | `<ValueCards>` (one stat card per sensor) |
| `query_aggregate` (single number over a range) | `<StatCard>` (avg/min/max + range) |
| anything else | a compact JSON/table fallback |

So the model **chooses the tool**, the tool returns typed data, and the **client
decides the visual** — the model never emits markup. (TanStack AI also supports a
typed `structured-output` part if we ever want the model to emit a card spec
directly; not needed for v1.)

---

## 4. Tools (read-only) — map the example questions

All tools are **read-only** wrappers over existing services. They return
**chart/card-ready** payloads (already shaped, units included).

| Tool | Wraps | Answers |
|---|---|---|
| `list_catalog` | Sensor/Group/Type services | grounding: what sensors/groups/types exist (also injected into the system prompt) |
| `get_latest` | latest reading per sensor (DataLoader) | "what's the temp in the bedroom" |
| `query_aggregate` | `ReadingService` bucket + agg over a range | "avg temp last night" (one number) |
| `query_series` | `ReadingService.bucketed` | "temp last week, day by day" (chart) |
| `compare` | `ReadingService.groupSeries` / bucketedMulti | "difference between the bedrooms" (chart/cards) |
| `active_alerts` | `AlertService` | "any alerts right now?" |
| `system_stats` | `TimescaleAdminService` | "how much data are we storing?" |

Group/type/time args accept names; the agent resolves them via `list_catalog` +
the catalog in the system prompt. Subtree semantics reuse the group tree.

**Mutations are allowed but confirm-gated.** Chosen scope = read + writes behind
a confirmation. Write tools (`create_sensor`, `assign_sensor_to_group`,
`create_group`, `create_emulator`, `set_emulator_running`, `create_sensor_type`,
…) are marked as **requiring approval** — TanStack AI surfaces an
`approval-requested` tool-call state; the chat renders a **Confirm / Cancel**
card and only runs the tool after the user approves (`addToolApprovalResponse`).
Reads run without a prompt. Destructive tools (delete) stay **out** of the chat
for now — manage those in the UI. Writes reuse the same services as the MCP
mutation tools.

---

## 5. Grounding, time, and anti-hallucination

- **System prompt** carries: the data model (groups are a tree with subtrees;
  sensors have a type + unit; the overlay/aggregate concepts), the **current time
  + timezone** (so "last night"/"last week" resolve to absolute ranges — Claude
  does the date math), and a compact **catalog** (group tree + sensor list +
  types) so it picks the right tool without a round-trip.
- **Rules:** answer **only** from tool results; never invent values; name the
  sensor/group + the time range used; if a tool returns no data, say so.

---

## 6. Security, cost, and UX guardrails (what we must not skip)

- **Key server-side only.** `OPENROUTER_API_KEY` in `apps/api` env; gate the
  endpoint like the MCP one (dev/explicit-enable).
- **Cost caps:** per-request `max_tokens`, **max tool-iteration count**, a
  per-session/IP **rate limit**, and a sensible default model. Reasoning tokens
  bill as output — bound them.
- **Read-only tools** (above) — the blast radius is a query, never a write.
- **Bounded queries:** reuse the existing `MAX_POINTS`/`ArrayMaxSize` bounds so a
  tool can't pull unbounded history.
- **Streaming UX:** thinking indicator, per-tool status ("querying…"), a **stop**
  button, error toasts, empty-state handling, markdown (tables/lists), mobile
  layout, focus/escape handling.
- **Observability:** log token usage + cost per chat turn.

---

## 7. "Anything we missed?" — gap checklist

1. **OpenRouter account + key** — a prerequisite you provide (env var). ✅ noted.
2. **Relative-time correctness** — timezone is the most common bug; pin it in the
   system prompt and pass `now`.
3. **Multi-turn follow-ups** — "and the office?" needs history; `useChat` keeps it,
   the server must accept the running message list.
4. **Empty / sparse data** — emulators are recent, so "last week" may be thin;
   the agent should say "only N hours of data" rather than imply a full week.
5. **Chart-type choice** — day-by-day → bars; intraday → line; comparisons →
   multi-line. Encode this in the tool output (a `chartHint`) or the component.
6. **Prompt-injection via names** — sensor/group names are user text rendered into
   the prompt; low risk locally, but keep them in data fields, not instructions.
7. **Refusals / model errors / OpenRouter outage** — graceful fallback message;
   optional `models: [...]` failover.
8. **Token/length limits** — cap history; summarize or truncate old turns.
9. **Persistence** — chat history across reloads (localStorage for v1; a thread
   table later). Out of scope for v1.
10. **Theming/dark-mode** — charts/cards must match the app's tokens.
11. **Accessibility** — keyboard open/close, ARIA on the panel, reduced-motion.
12. **Abuse / runaway loops** — hard cap tool iterations + total tokens per turn.

---

## 8. Build phases (small CodeRabbit-reviewed PRs)

0. **Spike** — `@tanstack/ai` server runtime streaming from a Nest SSE endpoint
   against OpenRouter; one trivial tool, plain text round-trip. De-risks §2.
1. **Backend agent** — `/agent/chat` endpoint, OpenRouter provider (Opus),
   system prompt + catalog, the read tools, cost/iteration caps, env gating.
2. **Frontend chat shell** — bottom-right FAB + panel, `useChat`, text + thinking
   + tool-status rendering, streaming + stop, markdown.
3. **Generative UI** — the tool-result → component registry (`SeriesChart`,
   `CompareChart`, `ValueCards`, `StatCard`), reusing the aggregates chart code.
4. **Confirm-gated writes** — add the write tools (require-approval) + the
   Confirm/Cancel card in the chat.
5. *(later)* persistence, per-user usage limits, model picker.

## Phase 1 implementation notes (the spec, as built)
- **Tool result shapes** are Zod `outputSchema`s in `agent.service.ts`; each
  carries a `kind` discriminator (`series` / `compare` / `stat` / `values` /
  `alerts` / `stats`) that the Phase 3 client registry keys on. `series`/`compare`
  also include a `chartHint` (`line`/`bar`) and `unit`.
- **Timezone source** — the browser sends `Intl.DateTimeFormat().resolvedOptions()
  .timeZone` via `useChat` `forwardedProps`; the server **validates** it (`Intl`)
  and falls back to UTC. It's injected into the system prompt and the
  `get_current_time` tool.
- **Prompt-injection** — interpolated names + timezone are sanitized (control
  chars stripped, length capped) in `agent.system-prompt.ts`; tool outputs are
  returned as structured data, never as instructions.
- **Write approval (Phase 4)** — `toolDefinition({ needsApproval: true })`; the
  client renders Confirm/Cancel and replies via `addToolApprovalResponse`.
  Allowed writes: create_sensor, create_group, rename_group, move_group,
  assign_sensor_to_group, create_sensor_type, create_emulator,
  set_emulator_running. **No deletes.**
- **Endpoint gating** — registered only when `OPENROUTER_API_KEY` is set **and**
  (dev or `AI_CHAT_ENABLED=true`); SSE piped with `stream.pipeline` for clean
  error/teardown.
- **Rate limiting** — out of scope for v1 (cost not a concern per the owner); a
  per-IP Nest guard can be added later.

## Decisions (confirmed)
- **Model tier** — ✅ **Opus** (`anthropic/claude-opus-4.x`, env-configurable).
- **Scope** — ✅ **read + confirm-gated writes** (reads free; mutations behind a
  Confirm card; deletes excluded for now).
- **Key** — you drop `OPENROUTER_API_KEY` (and optional `OPENROUTER_MODEL`) into
  `apps/api/.env`; required before the live round-trip can be tested.

Related: [[mcp-server]] (same service-layer tool pattern), [[sensor-grouping]],
[[dynamic-sensor-types]], [[data-emulators]].
