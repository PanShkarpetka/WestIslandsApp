# DonationGoalsPage

Route: `/donations` — `requiresAuth: false`.

## Purpose
Displays community fundraising goals as cards. Any logged-in user can create a new goal. Clicking a card opens the donors summary dialog.

## Sorting order
1. Incomplete goals before complete (complete = `currentAmount === targetAmount`)
2. Treasury goals (`treasury: true`) before non-treasury
3. Newest first by `createdAt`

## Components
- `DonationGoalCard` — single goal card with progress bar; receives `goal`, `isAdmin`, `isLoggedIn`, `nickname`
- `DonationsSummaryDialog` — shows donor breakdown for selected goal
- `DonationGoalCreateDialog` — create form, pre-filled with `createdBy: nickname`

## Auth visibility
- **Create button** visible to any logged-in user (`isLoggedIn`)
- `isAdmin` passed to cards for admin-only controls within the card

## Stores
- `useDonationGoalStore` — `subscribeToGoals()` / `stop()`, `goals`
- `useUserStore` — `isAdmin`, `isLoggedIn`, `nickname`
