# AdminView

Route: `/admin` - `adminOnly: true` (redirects to `/` if not admin).

## Purpose
Admin control panel. The page is organized into Vuetify tabs so large admin workflows stay separated while sharing the same loaded data and dialogs.
Tabs change only through the tab controls; swipe navigation is disabled so horizontal touch gestures do not switch sections on mobile.

## Sections
| Tab | Sub-file |
|-----|----------|
| Cycles | [AdminView/CyclesSection.md](AdminView/CyclesSection.md) |
| Heroes | [AdminView/HeroesSection.md](AdminView/HeroesSection.md), [AdminView/CampaignSummarySection.md](AdminView/CampaignSummarySection.md) |
| Resources | Trade goods, character item balances, and yield buildings management |
| Crafting | [AdminView/CraftingSection.md](AdminView/CraftingSection.md) |
| Event log | `logs` collection, ordered by `timestamp` desc, loaded once on mount |

## Shared Data Subscriptions
All started in `onMounted`, stopped in `onBeforeUnmount`:
- `heroes` collection snapshot -> `heroes.value`
- `religions` collection snapshot -> `religions.value`
- `clergy` collection snapshot -> `clergyRows.value`
- `hero-balance-sync-logs` query snapshot (last 1000, ordered by `syncedAt` desc) -> `heroBalanceSyncLogs.value`
- `crafting-requests` pending query snapshot -> `pendingCraftRequests.value`
- current-cycle used days snapshots -> `usedDaysByHero`
- `populationStore.startListening(islandId)`

## Computed Cross-Section Data
- `heroRows` - heroes joined with clergy (religion, clergyId), sorted alphabetically
- `heroWorkspaceRows` - the unified hero list, combining identity/status, account balance, and current-cycle used days from `usedDaysByHero` so admins search and paginate one table instead of three
- `religionOptions` - for hero form selects
- `clergyByHeroId` / `religionById` - lookup maps

## Crafting Approvals
The Crafting tab subscribes to pending `crafting-requests`, lets admins approve or reject them with checkboxes, and shows the validated crafting log for the active cycle from `cycle-crafting-logs`. Only approved requests are converted into real crafting progress and crafting logs.

## Styling
`WiPageHeader` provides the shared page hierarchy above the existing `.admin-card` workspace. Deep CSS overrides for Vuetify data tables, expansion panels, and inner cards remain in place to preserve the dense admin workflows.

## Yield building definitions

The Resources tab supports both legacy scheduled-harvest buildings and paid owner-action buildings. For an owner action, admins configure its gold cost, maximum uses per cycle, and one or more good/quantity choices. The good selector is intentionally backed only by existing `goods` documents, so the catalog item must be created first.
