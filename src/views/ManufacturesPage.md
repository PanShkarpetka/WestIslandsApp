# ManufacturesPage

Route: `/islands/:islandId/manufactures` (child of IslandsPage).

## Purpose
Lists manufactures linked to the island. Admins can add new ones or edit existing ones via a dialog.

## Data loading
Manufactures are stored as an array of IDs in `island.manufactures`. The page loads them directly from Firestore `manufactures` collection (chunked in batches of 10). Results are sorted to preserve the original order from the island document. No Pinia store — direct Firestore access.

## Income destination
Each manufacture has `incomeDestination`:
- `'treasury'` — income goes to island treasury
- `'guild:{guildId}'` — income goes to a specific guild

Display label resolved from `guildStore.guilds`. Icon: `mdi-anchor` for treasury, `mdi-sword-cross` for guild.

## Add/Edit dialog (admin only)
Single dialog handles both modes (`dialogMode: 'add' | 'edit'`).

**Add**: creates a new document in `manufactures` collection, then `arrayUnion`s its ID into `island.manufactures`.  
**Edit**: updates the existing document in place; updates local `manufactures.value` array optimistically.

Form fields: name (required), description, income (decimal, step 0.01), incomeDestination (select).

## Stores
- `useIslandStore` — `data.manufactures`, `data.id`
- `useUserStore` — `isAdmin`
- `useGuildStore` — `guilds` (for destination options)

## Watcher
`island.manufactures` change → `loadManufactures(ids)` re-runs.
