# HomeView

Route: `/`

## Purpose
Campaign dashboard and app homepage. Shows the current active cycle for context and summarizes the most recently finished cycle.

## Data
- `dashboardService.fetchDashboardData()` loads dashboard aggregates.
- Damaged ships come from `ships` where `hp < hpMax`.
- Last-cycle highlights are keyed to the newest finished `cycles/{cycleId}`.
- The latest expedition comes from `cycles/{cycleId}.expedition`; legacy titles fall back to the next cycle's existing `religion-actions.notes`.
- **Усі експедиції** opens a dashboard dialog with the complete expedition history: title, cycle dates, participant snapshots, crew count, and duration.
- Population deltas come from `cycle-summaries/{cycleId}`.
- Buildings added come from `islands/{islandId}.buildings.*.builtCycleId`.
- Crafting highlights use `heroes/*/crafting-logs` with `cycleId`.

## Behavior
- Public page following the app's existing open-page behavior.
- Missing historical data renders empty states instead of blocking the page.
- The expedition card shows its title, participant snapshots, duration, and total crew count.
- Login is available at `/login`.
