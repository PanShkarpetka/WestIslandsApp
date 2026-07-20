# GuildsPage

Route: `/guilds` — `requiresAuth: false`.

## Purpose
Guild management page. Shows guild cards with coin balance and goods inventory. Users can deposit funds; leaders and admins can withdraw funds and manage goods. Admins can create/edit guilds and view full logs.

Shared page-header, action, panel, and empty-state primitives provide consistent hierarchy. Guild permissions and mutations are unchanged.

## Visibility rules
- Admin: sees all guilds
- Leader: sees guilds where `user.canAccessGuild(guild.id)` is true, plus `visibleToAll` guilds
- Regular user: sees only `visibleToAll` guilds

## Dialogs
Three separate dialogs on the same page:

Primary create and transaction confirmations use the shared `WiActionButton` styling.

### Create/Edit guild dialog (`showGuildDialog`)
Fields: name, shortName, leader, visibleToAll (checkbox), withdrawUsername, withdrawPassword, treasure (initial balance).

### Transaction dialog (`showTxDialog`)
Modes: `deposit` or `withdraw`. Password field shown for non-admin withdrawals. Withdraw access: admin always allowed; leader if `nickname === guild.withdrawUsername && password === guild.withdrawPassword`.

### Goods dialog (`showGoodsDialog`)
Modes: `deposit` or `withdraw`. Available to admins and users with `canAccessGuild`. Non-admin goods withdrawals use the same password check as gold withdrawals. Goods log rows render item deltas and goods-after snapshots instead of coin amounts.

### Logs dialog (`showLogsDialog`)
Ledger table: when, who, type (deposit/withdraw/goods deposit/goods withdraw/building action), amount or goods delta, comment, balance after or goods after. Building-action rows show both the gold cost and gathered goods. Available to admins and users with `canAccessGuild`. "Оновити" button reloads logs on demand.

Each visible guild card has a **Будівлі (N)** button. It opens a read-only dialog listing every active island building whose typed or legacy owner fields resolve to that guild, including the configured action cost and per-cycle limit for owner-action buildings. The button is visible independently of treasury/log permissions.

## Guild card layout
CSS Grid: crest (col 1, rows 1-2), info (col 2, row 1), balance (col 3, rows 1-2), actions (col 1-3, row 3), log-hint (col 1-3, row 4). Negative balance triggers red border and `var(--wi-danger)` amount color.

## Stores
- `useGuildStore` — `subscribeGuilds()` / `unsubscribeGuilds()`, `guilds`, `addGuild()`, `updateGuild()`, `deposit()`, `withdraw()`, `depositGoods()`, `withdrawGoods()`, `getGuildLogs(guildId)`
- `useUserStore` — `isAdmin`, `isLoggedIn`, `nickname`, `canAccessGuild(guildId)`
