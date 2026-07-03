# AdminView — Cycles section

## Purpose
Creates new game cycles and records the expedition completed during the cycle being closed. Cycle rollover still triggers the existing religion, population, manufacture, building, and spell-request effects.

## Fields
- **Початок нового циклу** — `FaerunDatePicker` (Forgotten Realms calendar date)
- **Тривалість попереднього циклу** — read-only, computed as `diffInDays(previousCycleStart, newStart)` in Faerun days
- **Назва пригоди** — required expedition title
- **Учасники пригоди** — multiple active heroes
- **Тривалість експедиції** — expedition days excluding the seven-day rest period
- **Екіпаж** — one or more role/count/daily-rate groups; the initial sailor rate is 2 gold per day
- **Автоматичне списання** — splits crew cost between participants and writes `crew-payment` hero transactions
- Structured expeditions can be edited later (participants, duration, and crew groups). Editing recalculates display data, marks payment status as `edited`, and never changes balances or writes another transaction.

## Suggested date
On mount, `suggestNextCycleDate()` pre-fills the date picker with the previous cycle start + 7 Faerun days (one week). Uses modular arithmetic to handle month/year rollovers in the 360-day Faerun calendar.

## Create cycle flow
1. Validate the new date and, when a previous cycle exists, all expedition fields
2. Call `createNewCycleWithEffects()` from `cycleService.js` — this is the authoritative function that applies all cycle side-effects (religion distributions, treasury credits, etc.)
3. Store the expedition on the closed cycle and reload the expedition table
4. Reload `latestCycle` and re-suggest next date
5. Show success/error alert

## Data
- `latestCycle` — loaded once on mount via `getDocs` query (latest by `createdAt`)
- `islandStore.currentId` — passed to `createNewCycleWithEffects`
- `populationStore.totalPopulation` / `.items` — passed to `createNewCycleWithEffects`
- Legacy adventure titles are read from the next cycle's existing `religion-actions.notes`; new titles are not written to religion actions.
