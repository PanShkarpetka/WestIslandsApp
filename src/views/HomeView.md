# HomeView

Route: `/`

## Purpose
Campaign dashboard and app homepage. Shows the current active cycle for context and summarizes the most recently finished cycle.

## UI
Uses shared `src/components/ui/` primitives for the page header, metric cards, panels, section headers, and empty/loading states. Visible text is Ukrainian and all values come from `dashboardService.fetchDashboardData()`.

## Data
- `dashboardService.fetchDashboardData()` loads dashboard aggregates.
- Damaged ships come from `ships` where `hp < hpMax`.
- Last-cycle highlights are keyed to the newest finished `cycles/{cycleId}`.
- Population deltas come from `cycle-summaries/{cycleId}`.
- Buildings added come from `islands/{islandId}.buildings.*.builtCycleId`.
- Crafting highlights use `heroes/*/crafting-logs` with `cycleId`.

## Behavior
- Public page following the app's existing open-page behavior.
- Missing historical data renders empty states instead of blocking the page.
- Login is available at `/login`.
