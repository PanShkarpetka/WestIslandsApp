# AccountPage

Route: `/account` (`requiresAuth: false`, but the page requires `userStore.heroId` at runtime).

Shows the logged-in hero account: gold balance, goods inventory, caught fish inventory, and hero transaction history.

## Sections
- Gold balance: displays `heroes/{heroId}.goldBalance` and allows the player to withdraw gold. The withdrawal writes a `hero-transactions` record.
- Goods: displays positive quantities from `heroes/{heroId}.goods` with names from `goods/{goodId}` and allows withdrawal with a transaction log.
- Caught fish: requires `heroes/{heroId}.telegramId`. The field accepts either a numeric Telegram user ID or a username (`PanShkarpetka` / `@PanShkarpetka`). If it is empty, the page shows an error asking the player to contact an admin. If present, the page lists `caught-fish` rows by `telegramUserId` for numeric links or by normalized `telegramUsernameKey` for username links, then filters to `status === 'available'`.
- Transaction history: reads `hero-transactions` for the current hero, newest first.

## Fish Actions
Players can select multiple fish with checkboxes.

- `sellCaughtFish()` marks selected fish as `sold`, credits the hero with net gold, sends tax to `treasury/meta`, and writes both hero and treasury transaction logs.
- `releaseCaughtFish()` marks selected fish as `released` and writes a hero transaction log without changing balances.

Fish are not deleted from Firestore; status changes keep the audit trail intact.
