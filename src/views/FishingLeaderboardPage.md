# FishingLeaderboardPage

**Route:** `/fishing`  
**Auth:** `requiresAuth: false` (public within the app, read-only)

## Purpose

Displays leaderboard statistics for the Telegram fishing bot. All data is read from the `fishing-logs` Firestore collection — no new data structures required. The page updates in real-time via `onSnapshot`.

## Sections

1. **Header + Time Filter** — Title and a dropdown filter (All Time / This Week / Today). Filtering is client-side using ISO timestamp comparison.
2. **Summary Stat Cards** — Three cards showing total fish caught, total silver earned, and overall success rate across the selected period.
3. **Angler Rankings Table** — One row per unique `telegramUsername` (fallback to `telegramUserId`). Sortable by: catches, silver, best fish, win %, attempts. Top 3 rows show medal emojis.
4. **Rare Catches Hall of Fame** — Top 8 highest-value individual fish ever caught, shown as horizontally-scrollable cards. Not affected by the time filter (always all-time).
5. **Recent Activity Feed** — Last 20 fishing-log entries in reverse chronological order. Success entries show fish name + value in gold; failures show muted text. Relative timestamps (`timeAgo`).

## Store

`useFishingLeaderboardStore` (`src/store/fishingLeaderboardStore.js`)

- Subscribes to `fishing-logs` ordered by `timestamp desc`, limit 500
- Exposes: `logs`, `loading`, `error`, `anglerStats`, `rareCatches`, `recentFeed`
- `anglerStats` and `rareCatches` are computed from the full log set; the page applies the time filter client-side on top of `logs` for the summary and rankings table

## Admin vs User

No admin-only UI. All players see the same data.

## Non-obvious patterns

- `successFailureResult` can be the string `'success'`/`'failure'` or a boolean `true`/`false` — both forms are handled throughout.
- `fishValueSilver` is a snapshot embedded in `fishSelected` at catch time, not a live reference to the `fishes` collection.
- The time filter for the rankings table re-aggregates stats from `filteredLogs` (not from the store's `anglerStats`) so stats stay consistent with the summary cards.
