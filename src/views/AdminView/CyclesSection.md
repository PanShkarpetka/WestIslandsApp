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
- **Guild payment preview** — when selected participants are members of guilds with enabled `membership_payment_per_adventure` rules, the cycle form previews each automatic guild payment before saving.
- On cycle creation, guild membership payments are applied after crew payments: the member hero receives a `guild-membership-payment` deduction, the guild balance increases, and `guilds/{guildId}/logs` receives a `membership-payment` row. Negative hero balances are allowed for these deductions.
- Expedition records store separate `crewPaymentStatus` and `guildMembershipPaymentStatus` fields. The table combines them for display, so a cycle where only guild dues were charged does not appear as "no automatic deductions".
- Structured expeditions can be edited later (participants, duration, and crew groups). Editing recalculates display data, marks payment status as `edited`, and never changes balances or writes another transaction.
- The expedition table also shows `autoIncomeOperation` status for the closed cycle. Admins can run a money-only auto-income operation when it has not completed yet; this applies treasury, guild, hero-account, population, manufacture, and Coin Pig money entries, skips garden/yield goods, and stores per-target balance-change logs on the cycle document.

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
