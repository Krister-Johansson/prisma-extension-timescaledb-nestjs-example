# Frontend conventions (`apps/web`)

Engineering rules for the dashboard. The visual brief lives in [`DESIGN.md`](./DESIGN.md);
this file is **how** we build it. These are binding conventions, not suggestions.

## Stack

- **TanStack Router** (Vite SPA) — already scaffolded.
- **shadcn/ui** for components — see "shadcn" below.
- **TanStack Table** (https://tanstack.com/table) for all data tables, rendered with shadcn primitives.
- **TanStack Form** (https://tanstack.com/form) for all forms.
- **Zod** for all form schemas / validation (wired into TanStack Form as the validator).
- **GraphQL Code Generator** for the data layer — typed hooks/documents are generated from `*.gql` files; we never hand-write GraphQL types or hooks.

## shadcn — always via the CLI

Install every shadcn component with its own CLI; never hand-author or copy a shadcn
component file. Add each primitive as a feature needs it (one `add` per missing
primitive):

```bash
npx shadcn@latest add button
npx shadcn@latest add table
# …and so on for dialog, alert-dialog, skeleton, badge, card, tabs, select, form, sonner
```

## Component architecture — domain-driven & small

Components are **domain-driven** and split into the smallest meaningful pieces. Name them
by `domain-thing-part`, nesting from the container down to leaves. Example for a sensor
table:

```text
table-sensor                      # the table container (wires TanStack Table + shadcn)
table-sensor-skeleton             # loading state
table-sensor-empty                # empty state
table-sensor-row                  # a single row
table-sensor-row-action           # the row's action cluster
table-sensor-row-action-create    # a specific action (button + its own logic)
```

Prefer many tiny, named files over a few large ones. A component does one thing.

## Logic lives in the component responsible for it

Each component **owns the logic for what it does** — colocate the behavior, don't hoist it
into parents via callbacks/prop-drilling.

- A delete button in the sensor list (`...-row-action-delete`) opens the alert dialog,
  and **that dialog holds the delete logic** (the mutation, confirm/cancel, toasts).
- The button/dialog takes only the **identifying input it needs** (e.g. `sensorId`) — not
  `onDelete`/`onSuccess` callbacks.

The goal: duplicating or moving a button means passing an `id`, nothing more. Only add
callbacks/props when a parent genuinely needs to react (keep those the exception).

## Loading & empty states

- **Loading** → render the matching `*-skeleton` component (e.g. `table-sensor-skeleton`).
- **Empty** (a page or a table/list with no data) → render the matching `*-empty`
  component (e.g. `table-sensor-empty`). Don't show a bare empty table.

Every list/table ships its skeleton and empty siblings alongside it.

## Forms

- Build with **TanStack Form**; validate with a **Zod** schema (the form's source of truth
  for shape + validation). Render fields with shadcn `form`/inputs.

## Tables

- Build with **TanStack Table** for state (sorting/filtering/pagination/selection),
  rendered through shadcn's table primitives. The `table-<domain>` component wires the
  two together; rows/cells/actions are their own small components per the naming above.

## Data layer (GraphQL Codegen)

- Write operations in `*.gql` files colocated with the feature.
- GraphQL Code Generator produces typed documents/hooks consumed by components.
- Until the API is wired in, screens use static mock data shaped like these types (see
  `DESIGN.md`); the generated types should match the `apps/api` schema so the swap to
  live data is mechanical.
