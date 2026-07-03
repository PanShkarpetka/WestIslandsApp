# TravelView

Route: `/travel` — `requiresAuth: false`.

## Purpose
Container for travel-related calculators. Uses `v-tabs` + `v-window` to switch between two independent calculator tools.

The page uses `WiPageHeader` and keeps the calculator tabs directly below it. The former decorative hero banner was removed to match the compact application hierarchy.

## Tabs
| Tab value | Label | Component | Sub-file |
|-----------|-------|-----------|----------|
| `ships` | Кораблі | `ShipCalculator` | [TravelView/ShipsTab.md](TravelView/ShipsTab.md) |
| `couriers` | Кур'єри | `CourierCalculator` | [TravelView/CouriersTab.md](TravelView/CouriersTab.md) |

Default active tab: `ships`.

## Tab styling
`.travel-tabs` deep-styles `v-tab` with `wi-font-heading`, uppercase, gold color for selected, gold slider. No pirate card shell — uses standard Vuetify `v-tabs` on a clean container.

## State
`activeTab` ref (`'ships'` | `'couriers'`) — only local state, no store involvement at the page level.
