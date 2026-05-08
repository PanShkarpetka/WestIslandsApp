# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend development
npm run dev          # Vite dev server on port 5173
npm run build        # Production build → dist/
npm run preview      # Preview production build
npm test             # Run frontend tests (Node native test runner)

# Deploy
npm run deploy-stage # Deploy to Firebase staging channel
npm run deploy       # Deploy to Firebase production hosting

# Backend (Cloud Functions)
cd functions && npm test   # Run function tests
firebase deploy --only functions  # Deploy Cloud Functions
```

To run a single test file: `node --test tests/path/to/file.test.js`

## Architecture Overview

This is a **Vue 3 + Firebase** app managing guild/island data for a tabletop RPG (D&D) campaign, with a companion **Telegram fishing bot** implemented as Firebase Cloud Functions.

### Frontend (`src/`)

- **Entry:** `main.js` wires up Vue, Pinia, Vuetify (Material Design), and Vue Router
- **Routing:** `router/index.js` — 12+ routes, nested under `/islands/:islandId`. Guards use `requiresAuth` and `adminOnly` route meta, enforced in `router.beforeEach()`
- **State:** 14 Pinia stores in `store/`, each owning one domain (island, treasury, religion, population, ships, buildings, donations, mage guild, etc.). Stores call Firestore directly via async actions
- **Data layer:** `services/` handles Firestore reads/writes and real-time listeners (e.g., `cycleService.js`, `mageGuildService.js`)
- **UI:** Vuetify components + custom Vue components in `components/` (cards, dialogs, tables, progress bars) and page views in `views/`
- **Custom calendar:** `src/utils/faerun-date.js` uses the `faerun-date` package to represent dates in the Forgotten Realms calendar system

### Backend (`functions/`)

Single exported Cloud Function: `telegramWebhook` (POST handler).

```
functions/src/
├── telegram/          # Webhook handlers, Telegram API client, reply helpers
├── services/          # Firestore operations, fishing game logic
├── utils/             # Input validation, D20 dice rolls
└── config/constants.js
```

The fishing game uses D20 rolls + modifiers vs. a DC, bait selection, optional guidance re-roll, and per-day fish availability tracked in Firestore. Duplicate Telegram updates are deduplicated via Firestore before processing.

### Key Domain Concepts

- **Islands** — primary entity; most data is scoped to an island ID
- **Treasury** — silver currency, transactions, chest management
- **Religion** — faith tracking, distributions, donations (overflow logic)
- **Crafting** — discount formulas by category/subcategory/specialization; progress per hero; item slugs as identifiers
- **Fishing bot** — Telegram-driven mini-game with dice mechanics, bait, and daily resets

## Firestore Schema

All Firestore collection and document shapes are defined as JSDoc typedefs in [`src/types/firestore.js`](src/types/firestore.js).

**This file is the source of truth for the database schema.** Whenever you add, rename, or remove a field in any Firestore collection — in a store, service, or Cloud Function — you must update the corresponding typedef in `src/types/firestore.js` in the same change. Never leave the typedefs stale.

## Conventions

- Vue files: `PascalCase` (e.g., `IslandInfoPage.vue`, `TreasuryChestCard.vue`)
- Pinia stores: camelCase + `Store` suffix (`treasuryStore`, `religionStore`)
- Services: camelCase + `Service` suffix (`firestoreService`, `fishingService`)
- No ESLint/Prettier configured — no linting step exists
- Path alias `@/` resolves to `src/` (configured in `vite.config.mjs`)
