# HomeView

Route: `/`

## Purpose
Campaign dashboard and app homepage. Shows the current active cycle for context and summarizes the most recently finished cycle.

## UI
Uses shared `src/components/ui/` primitives for panels, section headers, and empty/loading/error states. The dashboard is a compact concept-led surface with:

- Campaign header showing the current cycle, the last finished cycle, and the finished cycle duration.
- Damaged ship repair status in a scan-friendly row layout with HP bars.
- Last-cycle population, treasury, and buildings-added summary blocks.
- Four highlight panels for best fish, crafter, mage request, and faith spend; the faith card shows the hero, action type, and points spent without action notes.

Visible text is Ukrainian and all values come from `dashboardService.fetchDashboardData()`.

## Data
- `dashboardService.fetchDashboardData()` loads dashboard aggregates.
- Damaged ships come from `ships` where `hp < hpMax`.
- Last-cycle highlights are keyed to the newest finished `cycles/{cycleId}`.
- Cycle duration comes from `cycles/{cycleId}.duration` and falls back to `startedAt`/`finishedAt` Faerun date math.
- Population deltas come from `cycle-summaries/{cycleId}`.
- Buildings added come from `islands/{islandId}.buildings.*.builtCycleId`.
- Crafting highlights use `heroes/*/crafting-logs` with `cycleId`.
- Best fish displays the linked hero name from `fishing-logs.heroName` or `heroes/{heroId}`; Telegram identity is only a fallback for unlinked logs.
- Faith spend uses `religion-actions` for the newest finished cycle and resolves hero names from existing `heroes` records.

## Behavior
- Public page following the app's existing open-page behavior.
- Loading and error states render as dashboard panels.
- Missing historical data renders empty text inside the relevant dashboard section instead of blocking the page.
- Login is available at `/login`.

## Constraints
- No Dashboard actions are exposed here.
- Dashboard fields stay derived from existing Firestore documents; no schema fields are introduced by the visual polish.
- The generated concept image used for this pass is a reference only and is not committed as an app asset.
