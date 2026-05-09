# AdminView

Route: `/admin` — `adminOnly: true` (redirects to `/` if not admin).

## Purpose
Admin control panel. Single-page with multiple distinct functional sections separated by `v-divider`. No tabs — vertical scroll layout.

## Sections
| Section | Sub-file |
|---------|----------|
| Cycle management | [AdminView/CyclesSection.md](AdminView/CyclesSection.md) |
| Heroes & clergy | [AdminView/HeroesSection.md](AdminView/HeroesSection.md) |
| Campaign summary & D&D Beyond import | [AdminView/CampaignSummarySection.md](AdminView/CampaignSummarySection.md) |
| Crafting | [AdminView/CraftingSection.md](AdminView/CraftingSection.md) |
| Event log | last section — `logs` collection, ordered by `timestamp` desc, loaded once on mount |

## Shared data subscriptions
All started in `onMounted`, stopped in `onBeforeUnmount`:
- `heroes` collection snapshot → `heroes.value`
- `religions` collection snapshot → `religions.value`
- `clergy` collection snapshot → `clergyRows.value`
- `hero-balance-sync-logs` query snapshot (last 1000, ordered by `syncedAt` desc) → `heroBalanceSyncLogs.value`
- `populationStore.startListening(islandId)`

## Computed cross-section data
- `heroRows` — heroes joined with clergy (religion, clergyId), sorted alphabetically
- `religionOptions` — for hero form selects
- `clergyByHeroId` / `religionById` — lookup maps

## Styling
Single `.admin-card` wrapping everything. Deep CSS overrides for Vuetify data tables, expansion panels, and inner cards to match the dark pirate theme.
