# PopulationPage

Route: `/islands/:islandId/population` (child of IslandsPage).

## Purpose
Displays population groups as image cards with stats. Includes a pie chart summary. Admins can click any card to open an edit dialog where all group counts can be adjusted simultaneously.

## Layout
Two-column flex layout:
- **Cards column** (`flex: 1 1 520px`) — `v-row` of group cards, one per population group
- **Chart column** (`flex: 0 1 320px`) — pie chart with total/income summary

## Population group cards
Each card shows:
- Background image from `g.imageUrl`
- Hover overlay with description text
- Stats: percentage, count (осіб), income per person
- Name badge at bottom
- "Редагувати" hint on hover (admin only)

Color palette: 8 pirate-themed colors, cycled by index.

## Edit dialog (admin only)
Opens when admin clicks any card. Shows all groups at once with slider + number input per group. Constraints:
- Sum of all groups must not exceed `totalPopulation` (from `islandStore`)
- Slider ceiling auto-expands to `max(totalPopulation, maxGroupValue, 100)`
- `overLimit` computed blocks save button

## Stores
- `usePopulationStore` — `startListening(islandId)` / `stopListening()`, `groupsAugmented`, `totalPopulation`, `populationIncomeTotal`, `setGroupCount(id, count)`
- `useIslandStore` — `currentId` for listener
- `useUserStore` — `isAdmin`

## Chart
`vue-chartjs` `Pie` component with `chart.js`. Legend at bottom, tooltip shows name + % + count + income.
