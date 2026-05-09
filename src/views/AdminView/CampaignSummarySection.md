# AdminView — Campaign Summary & D&D Beyond Import section

## Purpose
Import hero currency balances from a D&D Beyond JSON export and review the import preview before applying.

## Import flow
1. Paste JSON array into textarea
2. Click **Preview Import** — validates rows, matches by `dndbeyondCharacterId`, computes deltas
3. Review preview cards: matched heroes (with delta), unmatched snapshot rows, invalid rows, heroes missing from snapshot
4. Click **Apply Import** — updates each matched hero's `balance`, `balanceDelta`, and related sync fields; writes a log entry to `hero-balance-sync-logs`

## Validation rules
- Each row must be an object with `characterId` (non-empty string), `status: 'success'`, and `balance` object
- Duplicate `characterId` values block the apply button
- Balance normalized to `{ cp, sp, gp, ep, pp }` all as numbers

## Preview summary fields
`totalRows`, `validRows`, `matchedRows`, `unmatchedRows`, `invalidRows`, `missingHeroesFromSnapshot`

## Apply writes (per matched hero)
- `heroes/{heroId}`: updates `balance`, `balanceDelta`, `balanceSyncedAt`, `balanceSyncStatus: 'manual_import'`, `balanceSyncError: null`, `balanceSyncSource: 'manual_snapshot_import'`, `previousBalance`
- `hero-balance-sync-logs`: new document with full import record

## State (`snapshotImportState` reactive object)
`rawInput`, `preview`, `error`, `applying`, `applySummary`
