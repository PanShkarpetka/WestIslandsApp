# AdminView — Cycles section

## Purpose
Creates new game cycles (in-game time periods). Each cycle triggers downstream effects on religion, population income, and other systems.

## Fields
- **Початок нового циклу** — `FaerunDatePicker` (Forgotten Realms calendar date)
- **Тривалість попереднього циклу** — read-only, computed as `diffInDays(previousCycleStart, newStart)` in Faerun days
- **Нотатки до дії** — free text notes saved with the cycle

## Suggested date
On mount, `suggestNextCycleDate()` pre-fills the date picker with the previous cycle start + 7 Faerun days (one week). Uses modular arithmetic to handle month/year rollovers in the 360-day Faerun calendar.

## Create cycle flow
1. Validate: date must be set and after previous cycle start
2. Call `createNewCycleWithEffects()` from `cycleService.js` — this is the authoritative function that applies all cycle side-effects (religion distributions, treasury credits, etc.)
3. Reload `latestCycle` and re-suggest next date
4. Show success/error alert

## Data
- `latestCycle` — loaded once on mount via `getDocs` query (latest by `createdAt`)
- `islandStore.currentId` — passed to `createNewCycleWithEffects`
- `populationStore.totalPopulation` / `.items` — passed to `createNewCycleWithEffects`
