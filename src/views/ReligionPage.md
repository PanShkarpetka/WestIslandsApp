# ReligionPage

Route: `/religion` — `requiresAuth: false`.

## Purpose
Shows religion distribution, faith stats, and clergy abilities for the island. Has 4 view modes toggled via `v-btn-toggle`. See sub-files for each mode.

## View modes
| Value | Label | Component/content | Sub-file |
|-------|-------|-------------------|----------|
| `diagram` | Діаграма | `ReligionDistributionDiagram` | [DiagramView.md](ReligionPage/DiagramView.md) |
| `table` | Таблиця | `ReligionDistributionTable` | [TableView.md](ReligionPage/TableView.md) |
| `abilities` | Здібності | `ReligionAbilitiesTable` | [AbilitiesView.md](ReligionPage/AbilitiesView.md) |
| `celestial` | Небожитель | `ReligionModals` | [CelestialView.md](ReligionPage/CelestialView.md) |

Default view: `diagram`.

## Stores & services
- `useReligionStore` (or direct Firestore) — religion records, clergy, faith distribution
- `usePopulationStore` — total island population for percentage calculations
- `useIslandStore` — current island context

## UI shell
`WiPageHeader` provides the shared page hierarchy. The existing religion card and `v-btn-toggle` remain unchanged; loading, error, and empty states use `WiEmptyState`. Toggle label text is hidden on small screens (`.toggle-label` has responsive display).

## Components imported
- `ReligionDistributionDiagram`
- `ReligionDistributionTable`
- `ReligionAbilitiesTable`
- `ReligionModals`
