# TreasuryPage

Route: `/islands/:islandId/treasury` (child of IslandsPage).

## Purpose
Displays island treasury overview: cycle income, expenses, derived net total, chest card, and transaction history. The page uses the shared page header and metric-card foundation.

## Components
- `TreasuryChestCard` — chest balance and management UI
- `TreasuryTransactions` — scrollable transaction ledger
- `WiPageHeader` and `WiMetricCard` — shared heading and three-value cycle summary

## Income/Outcome calculation
The page aggregates income from two sources:
1. **Manufactures** — loaded via direct Firestore query on `island.manufactures` IDs (chunked in batches of 10 due to Firestore `in` limit). Only manufactures with `incomeDestination === 'treasury'` are counted.
2. **Population** — from `populationStore.populationIncomeTotal`. Positive = income, negative = outcome.

`totalIncome`, `totalOutcome`, and their derived net value are displayed in metric cards. No additional Firestore fields are read.

The chest operation dialog uses `WiDialogFrame`/`WiActionButton`, while the ledger uses `WiPanel`/`WiEmptyState`. Deposit, withdrawal, guild split, paging, and reload behavior are unchanged.

## Stores & services
- `useIslandStore` — `data.manufactures` (array of manufacture IDs)
- `usePopulationStore` — `startListening(islandId)` / `stopListening()`, `populationIncomeTotal`
- Direct Firestore reads from `manufactures` collection (not via a store)

## Watchers
- `island.manufactures` change → reload manufacture totals
- `islandStore.currentId` change → restart population listener
