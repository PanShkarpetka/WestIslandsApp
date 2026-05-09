# TreasuryPage

Route: `/islands/:islandId/treasury` (child of IslandsPage).

## Purpose
Displays island treasury overview: total income/outcome summary, chest card, and transaction history. Composed entirely from sub-components — the page itself is a thin orchestration layer.

## Components
- `TreasuryChestCard` — chest balance and management UI
- `TreasuryTransactions` — scrollable transaction ledger

## Income/Outcome calculation
The page aggregates income from two sources:
1. **Manufactures** — loaded via direct Firestore query on `island.manufactures` IDs (chunked in batches of 10 due to Firestore `in` limit). Only manufactures with `incomeDestination === 'treasury'` are counted.
2. **Population** — from `populationStore.populationIncomeTotal`. Positive = income, negative = outcome.

`totalIncome` and `totalOutcome` are displayed in the header bar (green/red).

## Stores & services
- `useIslandStore` — `data.manufactures` (array of manufacture IDs)
- `usePopulationStore` — `startListening(islandId)` / `stopListening()`, `populationIncomeTotal`
- Direct Firestore reads from `manufactures` collection (not via a store)

## Watchers
- `island.manufactures` change → reload manufacture totals
- `islandStore.currentId` change → restart population listener
