# MageGuildPage

Route: `/mage-guild` — `requiresAuth: false`.

## Purpose
Shows magical service requests generated per cycle. Active cycle requests are shown as spell cards. Admins can mark requests as fulfilled. Previous cycle history shown as collapsible expansion panels (admin only).

## Data model
Requests are stored per-document, one document per cycle. Each document has a `requests` array of spell requests. The `store.latestRequestDocument` is the active cycle; `store.productionDocuments.slice(1)` is history.

## Spell cards
Color-coded by spell level (`SPELL_LEVEL_COLORS`, levels 0-9). Left border accent uses `--spell-color` CSS variable. Fulfilled cards are `opacity: 0.65`.

Each card shows: level badge (tier icon + level number), spell name, status badge, downtime days, compensation amount, fulfilled-by hero name, Telegram post link.

## Fulfillment dialog (admin only)
Opens from a spell card's "Виконати" button. Fields: hero selector, mage guild treasury selector, mage guild percentage, Telegram post URL. Calls `store.markFulfilled()` with document ID, request ID, heroId, guildId, mageGuildTaxRate, islandId, telegramPostUrl, actorName.

The dialog Save button is the final fulfillment action: it saves the payout/log data and marks the request fulfilled in the same transaction. Admins do not click "Виконати" again after saving. The form defaults to a 10% mage guild share and prefers the `Гільдія Магів` guild when available.

The dialog shows a payout preview: gross compensation, island tax, mage guild share, and hero net reward. `mageGuildTaxRate` is entered in the UI as a percent and sent to the service as a multiplier (`20%` → `0.2`).

`fulfillmentForms` is a reactive map keyed by `{documentId}:{requestId}` to persist partial form state across dialog opens.

## Auto-generation
On mount and when `islandStore.currentId` changes, `ensureCurrentCycleRequests()` is called. This creates the current cycle's request document if it doesn't exist yet, based on island population.

## Business rules

### Request count
- `requestsMin = ceil(population / 100)`
- `requestsMax = requestsMin × 3`
- Actual count = random integer between min and max

### Spell selection
Spell level is picked by weighted random using `chance` values from the `mage-guild-configs/spell-request-prices` Firestore document (`spellTypes[level].chance`). Within the selected level, spell tier is also picked by weighted random (`spellTypes[level][tier].chance`). A random spell is then drawn from the matching pool.

### Per-request values
- `downtimeDays` = random integer between `tierConfig.downtimeMin` and `tierConfig.downtimeMax`
- `compensation` = `spell.currentPrice + spell.materialComponentPrice`

### Card sort order
Unfulfilled requests first → highest compensation → alphabetical by spell name.

### Price evolution (after cycle end)
`settlePreviousSpellRequests()` (called by `cycleService` when a new cycle starts) adjusts each spell's `currentPrice`:
- **Fulfilled** → price decreases by `priceConfig.delta` factor
- **Unfulfilled** → price increases by `priceConfig.delta` factor
- Price is clamped between `priceConfig.min` and `priceConfig.max`

This means popular spells get cheaper over time and neglected ones get more expensive.

### Fulfillment write
Firestore transaction: reads the `spell-requests` document, hero document, `treasury/meta`, selected `guilds/{guildId}`, and `islands/{islandId}`. It updates the matching request in the `requests` array in-place and applies the payout atomically.

Payout formula:
- `grossReward` = request `compensation`
- `treasuryTax` = `grossReward * islands/{islandId}.taxRate`
- `guildTax` = `grossReward * mageGuildTaxRate`
- `heroNetReward` = `grossReward - treasuryTax - guildTax`

The transaction updates `heroes/{heroId}.goldBalance`, `treasury/meta.balance`, and `guilds/{guildId}.treasure`; it also writes logs to `hero-transactions`, `treasury-transactions`, and `guilds/{guildId}/logs`. The request item stores a financial snapshot (`grossReward`, `heroNetReward`, tax amounts/rates, `mageGuildId`, `mageGuildName`) for history.

## Stores
- `useMageGuildStore` — `startListening()` / `stopListening()`, `latestRequestDocument`, `productionDocuments`, `heroes`, `openCount`, `fulfilledCount`, `markFulfilled()`, `ensureCurrentCycleRequests()`
- `useUserStore` — `isAdmin`, `nickname`
- `usePopulationStore` — `totalPopulation`
- `useIslandStore` — `currentId`
