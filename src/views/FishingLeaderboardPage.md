# FishingLeaderboardPage

**Route:** `/fishing`  
**Auth:** `requiresAuth: false` (public within the app, read-only)

## Purpose

Displays leaderboard statistics for the Telegram fishing bot. The page reads `fishing-logs` and `heroes` so public fishing stats can show linked hero names instead of Telegram usernames. It updates in real-time via `onSnapshot`.

## Sections

1. **Header + Time Filter** — Title and a dropdown filter (All Time / This Week / Today). Filtering is client-side using ISO timestamp comparison.
2. **Summary Stat Cards** — Three cards showing total fish caught, total silver earned, and overall success rate across the selected period.
3. **Angler Rankings Table** — One row per linked hero. New logs use `heroId`/`heroName`; older logs are resolved through `heroes.telegramId` against `telegramUserId` or `telegramUsername`; unlinked logs fall back to Telegram identity. Sortable by: catches, silver, best fish, win %, attempts. Top 3 rows show medal emojis.
4. **Treasure Ranking** — Aggregates `fishing-logs.treasuresFound[]` by participant and sorts by total treasure value. Shows treasure count, total gp, best treasure, and best treasure value. Fish rankings remain fish-only.
5. **Rare Catches Hall of Fame** — Top 8 highest-value individual fish ever caught, shown as horizontally-scrollable cards. Not affected by the time filter (always all-time).
6. **Recent Activity Feed** — Last 20 fishing-log entries in reverse chronological order. Success entries show fish name + value in gold and a compact treasure note when a jackpot was found; failures show muted text. Relative timestamps (`timeAgo`).

## Store

`useFishingLeaderboardStore` (`src/store/fishingLeaderboardStore.js`)

- Subscribes to `fishing-logs` ordered by `timestamp desc` and to `heroes` for display-name resolution
- Exposes: `logs`, `heroes`, `loading`, `error`, `rareCatches`, `recentFeed`, and helper methods for log participant display
- `anglerStats` and `rareCatches` are computed from the full log set; the page applies the time filter client-side on top of `logs` for the summary and rankings table

## Admin vs User

No admin-only UI. All players see the same data.

## Non-obvious patterns

- `successFailureResult` can be the string `'success'`/`'failure'` or a boolean `true`/`false` — both forms are handled throughout.
- `fishValueSilver` is a snapshot embedded in `fishSelected` at catch time, not a live reference to the `fishes` collection.
- `treasuresFound` is a separate jackpot snapshot embedded in the log; it does not affect fish value, fish sale totals, or treasury tax.
- The time filter for the rankings table re-aggregates stats from `filteredLogs` (not from the store's `anglerStats`) so stats stay consistent with the summary cards.
- Excluded testing Telegram usernames are still filtered by Telegram identity before converting display names to hero names.
