# AdminView — Heroes section

## Purpose
CRUD for heroes and their linked clergy records. Also shows hero balance snapshot history.

## Hero workspace
One searchable `v-data-table` combines profile/status, Telegram binding, account balance, and current-cycle used days. Rows come from `heroWorkspaceRows`, which reads each hero's breakdown directly from `usedDaysByHero`. The status filter defaults to active heroes, and profile/balance editing are adjacent row actions. Day categories use full labels so the breakdown remains understandable on touch devices.

## Add hero form
Collapsed until requested to keep the routine hero-management workflow focused.
Fields: name, religion (select), dndbeyondCharacterId, Telegram ID or username.  
On save: Firestore transaction that atomically creates both the `heroes` document and a `clergy` document linking hero to religion. New heroes receive the default player password `password`, empty `telegramId` when not filled, and `goldBalance: 0`. `telegramId` can store either a numeric Telegram user ID or a username such as `PanShkarpetka` / `@PanShkarpetka`. Initial clergy state: `faith: 0, faithMax: 0`.

## Edit hero dialog (`heroEditDialog`)
Fields same as add form + `downtimeAvailable` switch + `inactive` switch + player password.  
On save: transaction that updates `heroes` doc and updates (or creates if missing) the linked `clergy` doc's religion reference. Empty password input is reset to the default `password`.

## Account balance action
The unified workspace shows each hero's `goldBalance` and Telegram ID/username. The cash-edit row action opens a dialog to set a new `goldBalance`.

On save: transaction updates `heroes/{heroId}.goldBalance` and writes `hero-transactions` with type `admin-balance-adjustment` and `goldAmount = newBalance - previousBalance`. This does not change imported D&D Beyond `balance` snapshots.

## Balance snapshot history table
Collapsed by default. Shows last N snapshots (configurable: 5/10/20/50) from `hero-balance-sync-logs` collection when expanded.  
Snapshots are grouped by `snapshotGroupKey` — built as `snapshot-{source}-{minuteBucket}` where minuteBucket = `floor(syncedAt.toMillis() / 60000)`. This groups logs from the same import session into one column.  
Columns are sorted newest-first, sliced to limit. Rows = heroes, cells = balance + delta per snapshot.

## Campaign summary card
Aggregates current balances and deltas across all heroes. All 5 D&D currencies: CP, SP, GP, EP, PP. Delta values color-coded: positive = success, negative = error.

## Key data
- `heroes`, `religions`, `clergyRows`, `heroBalanceSyncLogs` — all real-time snapshots (see AdminView.md)
- `snapshotHistoryLimit` — local ref, controls how many snapshot columns display
