# ManufacturesPage

Route: `/islands/:islandId/manufactures` (child of IslandsPage).

## Purpose
Lists manufactures and auto-income/expense entries linked to the island, split across two tabs.

The page uses `WiPageHeader`, `WiActionButton`, `WiPanel`, and `WiEmptyState` for consistent hierarchy and states. Existing invoice-style item cards remain the primary list surface.

## Tabs
- **Мануфактури** — items with `type === 'manufacture'` or no `type` field (backward compat). Physical production facilities like Ферма Берика, Жир та Олія Моніки.
- **Авто-доходи** — items with `type === 'auto'`. Automatic periodic income or expense entries not tied to a physical manufacture.

## Data loading
Manufactures are stored as an array of IDs in `island.manufactures`. The page loads them directly from Firestore `manufactures` collection (chunked in batches of 10). Results are sorted to preserve the original order from the island document. No Pinia store — direct Firestore access.

## Item type
Each document has a `type` field: `'manufacture'` (default) or `'auto'`. Legacy documents without a `type` are treated as `'manufacture'`. The dialog exposes a type selector so admins can reassign items between tabs.

## Payouts
Each item uses `payouts[]`. Legacy `income` / `incomeDestination` documents are still read and displayed as one fixed payout.

Fixed payouts support:
- `'treasury'` — income goes to island treasury
- `'guild:{guildId}'` — income goes to a specific guild
- `'hero:{heroId}'` — income/goods go to a hero account balance

Coin Pig payouts use `mechanic: 'coinPig'` and `participantHeroIds`. On cycle rollover the service rolls `1d4-1` once per day of the closed previous cycle, splits the total between participants, and writes hero balance transactions.

Display labels resolve guild names from `guildStore.guilds` and hero names from `heroesStore.playerHeroes`.

## Add/Edit dialog (admin only)
Single dialog handles both modes (`dialogMode: 'add' | 'edit'`). When adding, `type` defaults to the currently active tab.

**Add**: creates a new document in `manufactures` collection, then `arrayUnion`s its ID into `island.manufactures`.  
**Edit**: updates the existing document in place; updates local `manufactures.value` array optimistically.

Form fields: name (required), description, type, and one or more payout rows. Each payout row selects either fixed payout fields or Coin Pig participants.

The form uses the shared `WiDialogFrame` and save action button. No payout fields, destinations, or mutations were changed by the visual migration.

## Stores
- `useIslandStore` — `data.manufactures`, `data.id`
- `useUserStore` — `isAdmin`
- `useGuildStore` — `guilds` (for destination options)
- `useHeroesStore` — player heroes (for hero destinations and Coin Pig participants)
- `useGoodsStore` — goods (for hero goods payouts)

## Watcher
`island.manufactures` change → `loadManufactures(ids)` re-runs.
