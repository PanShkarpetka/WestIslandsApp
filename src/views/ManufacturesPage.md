# ManufacturesPage

Route: `/islands/:islandId/manufactures` (child of IslandsPage).

## Purpose
Lists manufactures and auto-income/expense entries linked to the island, split across two tabs.

## Tabs
- **Мануфактури** — items with `type === 'manufacture'` or no `type` field (backward compat). Physical production facilities like Ферма Берика, Жир та Олія Моніки.
- **Авто-доходи** — items with `type === 'auto'`. Automatic periodic income or expense entries not tied to a physical manufacture.

## Data loading
Manufactures are stored as an array of IDs in `island.manufactures`. The page loads them directly from Firestore `manufactures` collection (chunked in batches of 10). Results are sorted to preserve the original order from the island document. No Pinia store — direct Firestore access.

## Item type
Each document has a `type` field: `'manufacture'` (default) or `'auto'`. Legacy documents without a `type` are treated as `'manufacture'`. The dialog exposes a type selector so admins can reassign items between tabs.

## Income destination
Each item has `incomeDestination`:
- `'treasury'` — income goes to island treasury
- `'guild:{guildId}'` — income goes to a specific guild

Display label resolved from `guildStore.guilds`. Icon: `mdi-anchor` for treasury, `mdi-sword-cross` for guild.

## Add/Edit dialog (admin only)
Single dialog handles both modes (`dialogMode: 'add' | 'edit'`). When adding, `type` defaults to the currently active tab.

**Add**: creates a new document in `manufactures` collection, then `arrayUnion`s its ID into `island.manufactures`.  
**Edit**: updates the existing document in place; updates local `manufactures.value` array optimistically.

Form fields: name (required), description, income (decimal, step 0.01), incomeDestination (select), type (select).

## Stores
- `useIslandStore` — `data.manufactures`, `data.id`
- `useUserStore` — `isAdmin`
- `useGuildStore` — `guilds` (for destination options)

## Watcher
`island.manufactures` change → `loadManufactures(ids)` re-runs.
