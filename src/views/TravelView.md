# TravelView

Route: `/travel` — `requiresAuth: false`.

## Purpose
Container for travel-related calculators. Uses `v-tabs` + `v-window` to switch between two independent calculator tools.

## Tabs
| Tab value | Label | Component | Sub-file |
|-----------|-------|-----------|----------|
| `ships` | Кораблі | `ShipCalculator` | [TravelView/ShipsTab.md](TravelView/ShipsTab.md) |
| `couriers` | Кур'єри | `CourierCalculator` | [TravelView/CouriersTab.md](TravelView/CouriersTab.md) |

Default active tab: `ships`.

## Tab styling
`.travel-tabs` deep-styles `v-tab` with `wi-font-heading`, uppercase, gold color for selected, gold slider. No pirate card shell — uses standard Vuetify `v-tabs` on a clean container.

## Hero banner
Decorative banner with a slowly rotating `mdi-ship-wheel` watermark (60s CSS spin), title, and subtitle. No interactive elements.

## State
`activeTab` ref (`'ships'` | `'couriers'`) — only local state, no store involvement at the page level.
