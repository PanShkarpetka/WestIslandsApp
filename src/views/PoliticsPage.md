# PoliticsPage

> ⚠️ **Status: stale and redundant.** This page is not linked from the Navbar and is effectively hidden. It is not actively maintained. Avoid adding features here without first confirming the page is being revived.

Route: `/politics` — `requiresAuth: false`.

## Purpose
Political proposals and interest group vote distribution. Non-admins see a read-only card view of current proposals with vote progress. Admins can CRUD proposals, toggle actuality, and edit the interest matrix.

## Sections

### Proposals (user view)
Cards with title, summary, vote progress bar. Only `actual: true` proposals shown. Vote support = `proposalVotes[p.id] / TOTAL_VOTES * 100%`.

### Proposals (admin view)
Table with all proposals (including non-actual). Actions: toggle `actual` flag, delete. Delete also cleans up all related `interests` documents.

### Add proposal form (admin only)
Inline form below the table. Fields: title, summary. Saves with `actual: true` and `serverTimestamp()`.

### Interest matrix (always visible)
Sticky-header, sticky-first-column table. Rows = population groups, columns = proposals. Each cell has a number input for `people` count (disabled for non-admins). Vote distribution is calculated client-side.

## Vote algorithm
Total votes: `TOTAL_VOTES = 10` (with 1 decimal precision).  
Group votes allocated proportionally by group `count` using `apportionFixed()` from `@/utils/votes`.  
Per-proposal votes: each group's quota × (interested people / group population), distributed across proposals by `apportionFixed()`. Undecided population = group votes not assigned anywhere.

## State
- `proposals` — real-time Firestore listener (filtered by `actual` for non-admins)
- `groups` — from `useInterestGroupStore` (real-time)
- `interests` — real-time Firestore listener on `interests` collection, keyed as `{groupId}_{proposalId}`

## Key computed values
- `groupVotes` — each group's share of TOTAL_VOTES
- `proposalVotes` — total votes per proposal across all groups
- `groupUndecided` — how many people in each group have no stated preference
