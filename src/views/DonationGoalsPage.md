# DonationGoalsPage

Route: `/donations` — `requiresAuth: false`.

## Purpose
Displays community fundraising goals as cards. Any logged-in user can create a new goal. Clicking a card opens the donors summary dialog.

The page uses `WiPageHeader`, `WiActionButton`, `WiPanel`, and `WiEmptyState` for shared hierarchy and empty states. Goal cards and their existing progress/details remain unchanged.

## Sorting order
1. Incomplete goals before complete (complete = `currentAmount === targetAmount`)
2. Treasury goals (`treasury: true`) before non-treasury
3. Newest first by `createdAt`

## Components
- `DonationGoalCard` — single goal card with progress bar; receives `goal`, `isAdmin`, `isLoggedIn`, `nickname`
- `DonationsSummaryDialog` — shows donor breakdown for selected goal
- `DonationGoalCreateDialog` — create form, pre-filled with `createdBy: nickname`

The create and donor-summary dialogs use the shared `WiDialogFrame`; all existing form fields, building discount behavior, donor totals, and writes are preserved.

## Auth visibility
- **Create button** visible to any logged-in user (`isLoggedIn`)
- `isAdmin` passed to cards for admin-only controls within the card

## Stores
- `useDonationGoalStore` — `subscribeToGoals()` / `stop()`, `goals`
- `useUserStore` — reactive `isAdmin`, `isLoggedIn`, `nickname`
