# IslandsPage

Route: `/islands/:islandId` — parent shell, `requiresAuth: false`.

## Purpose
Layout shell for island-scoped pages. Renders the plank-tab navigation bar and a `<RouterView />` for the active child page. Does **not** render island content itself — each child page is responsible for its own content.

## Child routes (tabs)
| Tab label | Route | Component |
|-----------|-------|-----------|
| Інфо | `/islands/:islandId` | `IslandInfoPage` |
| Будівлі | `/islands/:islandId/buildings` | `BuildingsPage` |
| Населення | `/islands/:islandId/population` | `PopulationPage` |
| Скарбниця | `/islands/:islandId/treasury` | `TreasuryPage` |
| Мануфактури | `/islands/:islandId/manufactures` | `ManufacturesPage` |

See each child page's `.md` for details.

## Plank-tab pattern
Tabs are `RouterLink`s styled as `.plank-tab`. Active tab uses `isExactActive` — only the exact route match activates, so `/islands/Камінь` and `/islands/Камінь/buildings` are independent.

## Stores subscribed here
- `islandStore.subscribe()` / `.stop()`
- `buildingStore.subscribe()` / `.stop()`
- `donationGoalStore.subscribeToGoals()` / `.stop()`

These are mounted/unmounted at the shell level so child pages don't need to re-subscribe for island and building data.

## Island name
Currently hardcoded to `'Камінь'`. The `:islandId` param is not dynamically used yet — the tabs are built from the hardcoded string.
