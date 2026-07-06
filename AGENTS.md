# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Rules

**Never run `npm run deploy`, `npm run deploy-stage`, or `firebase deploy` unless the user explicitly asks to deploy or release.** Building (`npm run build`) is fine without permission; deploying to production is not.

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

The fishing game uses D20 rolls + modifiers vs. a DC, bait selection, optional guidance re-roll, and per-day fish availability tracked in Firestore. Seasonal weather can modify fishing DC, computed roll sum, fish value, and treasure chance; it never changes the one-fish-per-attempt limit. Duplicate Telegram updates are deduplicated via Firestore before processing.

### Firebase credentials and Telegram admin ops

- Telegram bot admin commands (`/admin_fish_*`) must be protected by `TELEGRAM_ADMIN_USER_IDS` and/or `TELEGRAM_ADMIN_USERNAMES`; do not add new admin commands that bypass this allowlist.
- Keep Firebase service account JSON files outside the repository. Never commit service account keys, private keys, `functions/service-account.json`, or `migrations/firebaseAdmin.local.json`.
- Migration scripts in `migrations/` use Firebase Admin credentials in this order: `FIREBASE_SERVICE_ACCOUNT_JSON`, `GOOGLE_APPLICATION_CREDENTIALS`, ignored `migrations/firebaseAdmin.local.json`, then Application Default Credentials.
- `migrations/firebaseAdmin.local.json` may contain a machine-local path to an external key file; it is intentionally ignored and must stay untracked.
- Cloud Functions use `admin.initializeApp()` with the deployed runtime identity; do not point deployed Functions at a checked-in service account file.

### Key Domain Concepts

- **Islands** — primary entity; most data is scoped to an island ID
- **Treasury** — silver currency, transactions, chest management
- **Religion** — faith tracking, distributions, donations (overflow logic)
- **Crafting** — discount formulas by category/subcategory/specialization; progress per hero; item slugs as identifiers
- **Fishing bot** — Telegram-driven mini-game with dice mechanics, bait, weather effects, and daily resets
- **Cycles, seasons, and weather** — the active cycle has a Faerun start date, a derived season, and a deterministic 7-day seasonal weather forecast. The public widget shows the current weather; admins can view the week-ahead forecast.

## Firestore Schema

All Firestore collection and document shapes are defined as JSDoc typedefs in [`src/types/firestore.js`](src/types/firestore.js).

**This file is the source of truth for the database schema.** Whenever you add, rename, or remove a field in any Firestore collection — in a store, service, or Cloud Function — you must update the corresponding typedef in `src/types/firestore.js` in the same change. Never leave the typedefs stale.

## Conventions

- Vue files: `PascalCase` (e.g., `IslandInfoPage.vue`, `TreasuryChestCard.vue`)
- Pinia stores: camelCase + `Store` suffix (`treasuryStore`, `religionStore`)
- Services: camelCase + `Service` suffix (`firestoreService`, `fishingService`)
- No ESLint/Prettier configured — no linting step exists
- Path alias `@/` resolves to `src/` (configured in `vite.config.mjs`)

### Admin gate pattern
Always use `computed(() => useUserStore().isAdmin ?? false)` — never read `isAdmin` directly in templates without the null-safe fallback.

### Dialog UI pattern
All dialogs follow the same structure: dark gradient card (`--wi-surface` → `--wi-bg` gradient) with `1px solid var(--wi-gold)` border, a custom header div (not `v-card-title`), `v-card-text` body, `v-divider`, and `v-card-actions` footer. The global theme in `src/styles/theme.css` applies this automatically to `.v-dialog .v-card` — avoid overriding it per-dialog.

### Firestore access patterns
- **Real-time data** (stores, live UI): use `onSnapshot` with a stop function stored and called in `onBeforeUnmount`
- **One-time reads** (admin imports, initial load): use `getDocs`
- **`in` query limit**: Firestore limits `where(field, 'in', array)` to 10 items — chunk larger arrays and run multiple queries

### Image assets
- `/public/images/buildings/{id}.png` — building pin images (referenced as `/images/buildings/…` at runtime)
- `/public/images/island/{id}.jpg` — island map backgrounds
- `src/images/` — source-bundled images imported via `@/images/…`

## Design System

The pirate theme lives in `src/styles/theme.css`. All Vuetify components are globally themed there — don't override base component styles per-page unless unavoidable.

### CSS tokens
| Token | Value | Use |
|-------|-------|-----|
| `--wi-bg` | `#1a1209` | Page background |
| `--wi-surface` | `#2c1e0f` | Card/panel background |
| `--wi-surface-hi` | `#3d2a14` | Elevated surface |
| `--wi-gold` | `#c8962a` | Primary accent, headings |
| `--wi-gold-light` | `#e8b84b` | Hover gold, borders |
| `--wi-copper` | `#7b4f2e` | Secondary warm accent |
| `--wi-text` | `#f0ddb0` | Body text |
| `--wi-text-muted` | `#a8896a` | Secondary/label text |
| `--wi-border` | `#5a3e20` | Borders, dividers |
| `--wi-success` | `#5a8a3c` | Positive amounts, success states |
| `--wi-danger` | `#8b2a2a` | Errors, negative amounts |
| `--wi-sea` | `#3a6080` | Sea-themed accents |

### Typography classes
- `.wi-heading` — Cinzel serif, gold, letter-spacing (applied to `h1`–`h4` globally)
- `.wi-number` — Cinzel Decorative, gold (currency amounts, large stats)
- `.wi-mono` — Special Elite cursive
- `.wi-parchment` — parchment-toned gradient background with border

### Utility color classes
`wi-gold-text`, `wi-muted-text`, `wi-sea-text`, `wi-danger-text`, `wi-success-text`

> For detailed design guidance use the `west-islands-style` skill.

## Shared Utilities & Constants

### `src/config/constants.js`
- `DEFAULT_ISLAND_ID` — `'island_rock'` — the single active island's Firestore document ID
- `PSEUDO_RELIGION_ID` — `'psevdo'` — placeholder religion used for heroes with no religion assigned

### Island tax rate
- `islands/island_rock.taxRate` is the base island tax multiplier (`0.1` = 10%). New financial features must read this value instead of hardcoding a 10% tax.
- `fishSaleTaxRate` may still exist as a specialized/legacy fish-sale tax field; do not treat it as the general island tax.

### `src/utils/formatters.js`
- `formatAmount(value, decimals = 2)` — formats a number to fixed decimal string; returns `'0.00'` for non-finite values. Used for all currency display.

### Faerun date utilities (`faerun-date` package + `src/utils/faerun-date.js`)
- `parseFaerunDate(value)` — parses a stored date to `{ day, month, year }`
- `normalizeFaerunDate(value)` — normalizes picker output to storable format
- `diffInDays(dateA, dateB)` — difference in Faerun calendar days (360-day year, 12 months × 30 days)
- `DEFAULT_YEAR` — the current campaign year constant

### Seasons and weather
- `src/utils/faerun-date.js` exposes `getFaerunSeason(dateOrString)`. Seasons are derived from Faerun months, not stored manually in Firestore.
- `src/utils/faerun-weather.js` generates and resolves deterministic seasonal forecasts for the frontend. `functions/src/utils/faerunWeather.js` mirrors the same domain logic for Telegram/Cloud Functions; keep both in sync when changing weather rules.
- `CycleDoc.weatherForecast` stores the initial deterministic 7-day forecast generated from `cycleId + startedAt`. Existing cycles without this field should use the deterministic fallback helper instead of requiring migrations.
- Current displayed weather is resolved by real calendar day offset from the cycle document's `createdAt`, using the `Europe/Kiev` day boundary. This advances weather at real midnight without changing `startedAt`; creating/updating the active cycle resets the forecast anchor.
- Weather must keep progressing after the stored 7-day forecast. Use deterministic generation for arbitrary `dayOffset` instead of clamping to the last stored day. Admin forecast views should show the next 7 real-day entries from today, not only the first week from cycle start.
- Weather should stay seasonal for an Oceania-like island climate: no ordinary snow as a typical winter result; winter can have cool rain, strong wind, storms, or rare anomalous cold, while summer can include heat, scorching sun, humidity, tropical rain, and tropical storms.
- Fishing effects may adjust `effectiveEachRollDc`, `finalComputedSum`, `fishValueMultiplier`, and `treasureChanceMultiplier`, but weather must not increase catch quantity beyond one fish.

## Testing

Tests use Node's native test runner. All test files live in `tests/` mirroring the `src/` structure:

```
tests/
├── services/   # authService, craftingService, cycleService, logService
├── store/      # guildStore, treasuryStore, userStore
└── utils/      # courierDistanceCalculator, faerun-date, faerun-weather, mageGuildRequests, votes
```

Run a single file: `node --test tests/utils/votes.test.js`
Tests do **not** cover Vue components or pages — only services, stores, and utility functions.

For weather/fishing changes, run the frontend weather utility tests plus the mirrored function tests, then build:
- `node --test tests/utils/faerun-weather.test.js`
- `node --test functions/tests/faerunWeather.test.js functions/tests/fishingService.test.js functions/tests/firestoreService.test.js`
- `npm run build`

## Page Documentation

Each page view has a companion `.md` file alongside its `.vue` file in `src/views/`. Complex pages with tabs or major sections have a sub-directory of per-tab/per-section files.

### Island pages (nested under `/islands/:islandId`)
- [IslandsPage.md](src/views/IslandsPage.md) — nav shell, plank-tab bar
- [IslandInfoPage.md](src/views/IslandInfoPage.md) — island parameters, admin edit
- [BuildingsPage.md](src/views/BuildingsPage.md) — LegendKeeper map embed
- [YieldBuildingsPage.md](src/views/YieldBuildingsPage.md) — supplier buildings and harvest scheduling
- [PopulationPage.md](src/views/PopulationPage.md) — group cards, pie chart, admin edit dialog
- [TreasuryPage.md](src/views/TreasuryPage.md) — chest card + transaction history
- [ManufacturesPage.md](src/views/ManufacturesPage.md) — manufacture cards, admin CRUD

### Standalone pages
- [HomeView.md](src/views/HomeView.md) — campaign dashboard homepage, current/last cycle highlights
- [LoginView.md](src/views/LoginView.md) — auth flows, pirate-themed entry
- [AccountPage.md](src/views/AccountPage.md) — hero account balance, goods, caught fish, transaction history
- [ShipsView.md](src/views/ShipsView.md) — fleet management, ship cards
- [DonationGoalsPage.md](src/views/DonationGoalsPage.md) — fundraising goals, donor dialog
- [ReligionPage.md](src/views/ReligionPage.md) — 4-mode view toggle
  - [DiagramView.md](src/views/ReligionPage/DiagramView.md)
  - [TableView.md](src/views/ReligionPage/TableView.md)
  - [AbilitiesView.md](src/views/ReligionPage/AbilitiesView.md)
  - [CelestialView.md](src/views/ReligionPage/CelestialView.md)
- [PoliticsPage.md](src/views/PoliticsPage.md) — proposals, interest matrix, vote algorithm
- [GuildsPage.md](src/views/GuildsPage.md) — guild cards, deposit/withdraw, ledger dialog
- [MageGuildPage.md](src/views/MageGuildPage.md) — spell request cards, fulfillment, history panels
- [CraftingPage.md](src/views/CraftingPage.md) — mastery tracker, price calculator
- [FishingLeaderboardPage.md](src/views/FishingLeaderboardPage.md) — fishing bot leaderboard, angler rankings, rare catches, live feed
- [TravelView.md](src/views/TravelView.md) — v-tabs container
  - [ShipsTab.md](src/views/TravelView/ShipsTab.md)
  - [CouriersTab.md](src/views/TravelView/CouriersTab.md)
- [AdminView.md](src/views/AdminView.md) — admin panel sections
  - [CyclesSection.md](src/views/AdminView/CyclesSection.md)
  - [HeroesSection.md](src/views/AdminView/HeroesSection.md)
  - [CampaignSummarySection.md](src/views/AdminView/CampaignSummarySection.md)
  - [CraftingSection.md](src/views/AdminView/CraftingSection.md)

## Creating a New Page

### 1. Create the Vue component

Add `src/views/YourPageName.vue`. Follow existing page patterns:
- Use `<v-container>` as the root element
- Apply pirate design tokens (`--wi-gold`, `--wi-font-heading`, `--wi-border`, etc.)
- Use `useUserStore().isAdmin` to gate admin-only UI
- Subscribe to stores in `onMounted`, unsubscribe in `onUnmounted`/`onBeforeUnmount`

### 2. Register the route

Add to `router/index.js`:

```js
import YourPageName from '@/views/YourPageName.vue';

// In routes array:
{ path: '/your-path', component: YourPageName, meta: { requiresAuth: false } }
// or for admin-only:
{ path: '/your-path', component: YourPageName, meta: { adminOnly: true } }
```

Auth guard is already handled by `router.beforeEach()` — just set the correct meta flag.

### 3. Add to Navbar

Add a navigation entry in `src/components/Navbar.vue` if the page should be globally accessible.

### 4. Create the companion `.md` file

Create `src/views/YourPageName.md` alongside the `.vue` file. Document:
- Route and auth meta
- Purpose (one paragraph)
- Sections/components rendered
- Stores and services used
- Admin vs user behavior differences
- Any non-obvious patterns or constraints

If the page introduces a new service or utility function, add tests for it under `tests/` mirroring the `src/` path.

### 5. If the page has tabs or major sections

Create a sub-directory `src/views/YourPageName/` with one `.md` per tab or section. Reference them from `YourPageName.md` with relative links.

For `v-tabs` pages: name files after the tab value (e.g., `ShipsTab.md`, `CouriersTab.md`).
For section-based pages (like AdminView): name files after the section (e.g., `CyclesSection.md`).

### 6. Update `AGENTS.md`

Add the new page to the **Page Documentation** section above, under the appropriate group (island pages or standalone pages), with a relative link to its `.md` file.
