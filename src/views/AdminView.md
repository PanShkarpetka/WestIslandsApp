# AdminView

Route: `/admin` - `adminOnly: true` (redirects to `/` if not admin).

## Purpose
Admin control panel. The page is organized into Vuetify tabs so large admin workflows stay separated while sharing the same loaded data and dialogs.

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
- `usedDaysRows` - current-cycle crafting, mage help, religion, and total used days per hero
- `religionOptions` - for hero form selects
- `clergyByHeroId` / `religionById` - lookup maps

## Crafting Approvals
The Crafting tab subscribes to pending `crafting-requests`, lets admins approve or reject them with checkboxes, and shows the validated crafting log for the active cycle from `cycle-crafting-logs`. Only approved requests are converted into real crafting progress and crafting logs.

## Styling
Single `.admin-card` wrapping everything. Deep CSS overrides for Vuetify data tables, expansion panels, and inner cards to match the dark pirate theme.
