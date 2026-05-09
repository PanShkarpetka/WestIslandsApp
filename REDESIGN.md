# West Islands — Redesign Brief

## Vision

**Pirate & nautical fantasy.** The app manages a D&D island guild — it should feel like a worn captain's logbook, a harbour tavern notice board, and a treasure map rolled into one. Dark, atmospheric, and adventurous — not a modern SaaS dashboard.

---

## Visual Direction

### Mood & References
- Aged parchment and dark wood textures
- Candlelit tavern / ship cabin aesthetic
- Treasure maps, nautical charts, wax seals
- Weathered brass, gold coins, iron chains

### Color Palette

| Role | Color | Notes |
|---|---|---|
| Background | `#1a1209` | Near-black dark oak |
| Surface (cards) | `#2c1e0f` | Dark aged wood |
| Surface elevated | `#3d2a14` | Lighter wood panel |
| Primary accent | `#c8962a` | Tarnished gold |
| Secondary accent | `#7b4f2e` | Weathered copper/rust |
| Text primary | `#f0ddb0` | Parchment cream |
| Text secondary | `#a8896a` | Faded ink |
| Success/positive | `#5a8a3c` | Mossy green |
| Danger/negative | `#8b2a2a` | Blood red |
| Info/neutral | `#3a6080` | Sea blue |
| Border/divider | `#5a3e20` | Wood grain line |

### Typography

| Role | Font | Source |
|---|---|---|
| Headings / titles | **Cinzel** | Google Fonts |
| Body / labels | **IM Fell English** | Google Fonts |
| Numbers / data | **Cinzel Decorative** | Google Fonts |
| Monospace / codes | **Special Elite** | Google Fonts |

All fonts loaded via `<link>` in `index.html`. Apply via Vuetify theme `defaultProps` and CSS variables.

**Base font size:** `html { font-size: 17px }` in `src/styles/theme.css` (browser default is 16px). This scales all `rem` values up ~6% globally — do **not** override `font-size` on `html` to a smaller value. All per-component sizes are written in `rem` so they inherit this scale automatically.

### Textures & Decoration
- Card backgrounds: subtle parchment paper SVG noise or CSS grain filter
- Section dividers: rope or wave SVG ornaments
- Buttons: embossed look with inset shadow, brass/gold border
- Dialog overlays: dark linen texture
- Icons: prefer `mdi` icons that map to pirate/nautical concepts where possible (anchor, compass, sword, ship, chest, skull)

### Component Patterns (established during implementation)

| Component | Rule |
|---|---|
| `v-tooltip` | Near-black bg (`#0f0a04`), parchment text (`#f0ddb0`), gold border. **Never** default Vuetify tooltip (black text on dark bg). |
| `v-btn` icon in navbar | Muted text color at rest, gold on hover. Override `v-btn__overlay` to gold to prevent dark smudge on hover. |
| Vuetify `v-btn__overlay` | Always override to match the intended hover color — default inherits text color and creates dark blobs. Apply to ALL buttons including inside `v-btn-toggle`. Set `opacity: 0 !important` on active state overlay too — otherwise it washes over the active button's text. |
| MDI icon availability | Always verify icons exist in v7.4.47 before using. `mdi-cannon`, `mdi-catapult`, `mdi-dragon`, `mdi-bull` do **not** exist. Use `grep` on `node_modules/@mdi/font/css/materialdesignicons.css` to confirm. |
| `v-dialog` on mobile | Always add `:fullscreen="$vuetify.display.smAndDown"` and `scrollable` to all dialogs. |
| Base font size | Set globally via `html { font-size: 17px }`. All component sizes use `rem` — never set `html` font-size smaller than 17px. |
| Slider thumb label | Override `.your-slider :deep(.v-slider-thumb__label)` with `background: var(--wi-gold) !important; color: #1a1209 !important` — default Vuetify label is unreadable on dark backgrounds. |
| Form fields in dialogs | Use `variant="outlined" density="compact"` for all fields inside dialogs — keeps layout tight and aligns with the dark theme. |
| Page root element | Every top-level page component **must** use `<v-container>` (not `<div>`) as its root element. `v-container` provides the horizontal padding that aligns content with all other pages. Plain `<div>` roots produce no side padding and misalign content. |
| Portrait / group images | Use `background-position: top center` (not `center`) for portrait-style background images so faces are not cropped at the top of the card. |
| Population income fallback | Firestore population docs may store income as `incomePerPerson`, `income`, or `incomePer`. Always read with: `group?.incomePerPerson ?? group?.income ?? group?.incomePer ?? 0`. Same fallback applies in `cycleService.js` when computing treasury income from population. |

---

## Tech Approach

### 1. Vuetify Custom Theme (global impact, low effort)

Define a `pirateTheme` in `src/main.js`:

```js
const vuetify = createVuetify({
  theme: {
    defaultTheme: 'pirateTheme',
    themes: {
      pirateTheme: {
        dark: true,
        colors: {
          background: '#1a1209',
          surface: '#2c1e0f',
          primary: '#c8962a',
          secondary: '#7b4f2e',
          error: '#8b2a2a',
          success: '#5a8a3c',
          info: '#3a6080',
        },
      },
    },
  },
});
```

### 2. Global CSS (`src/styles/theme.css`)

- Import Google Fonts
- CSS custom properties for textures, borders, shadows
- Override Vuetify utility classes (`.v-card`, `.v-btn`, `.v-app-bar`, `.v-tab`, etc.)
- Loaded once in `main.js`

### 3. Per-page / Per-component polish

Applied page by page after the global theme is in place.

---

## Page Inventory & Redesign Scope

Each page is tagged: **Style** (visual restyle only) or **Style + UX** (layout/interaction changes too).

---

### `/` — Login
**Type:** Style + UX
- Replace flat card with a weathered scroll/parchment panel centered on a dark sea-texture background
- Title: "West Islands" in Cinzel with anchor icon
- Nickname input styled as an ink-on-parchment field
- Login button: brass-bordered "Set Sail" button
- UX: add subtle animated fog or wave background (CSS only, no heavy libs)

---

### `/islands/:islandId` — Island Shell (tabs)
**Type:** Style + UX
- Replace Material tabs with a wooden plank tab bar — active tab looks like a raised board
- Island name in large Cinzel heading with a compass rose icon
- Sticky header with island name visible when scrolling child pages

---

### `/islands/:islandId` (index) — Island Info
**Type:** Style
- Replace flat info fields with a "captain's log" card: parchment background, ink-styled labels
- Admin save button: "Update Records" with quill icon
- Discount values displayed as stamped badge chips

---

### `/islands/:islandId/buildings` — Buildings
**Type:** Style + UX
- Map overlay pins → style as glowing lantern markers on an old map background
- Dialog: parchment scroll style with building name as wax-seal header
- Built buildings: gold pin; unbuilt: grey rusted pin

---

### `/islands/:islandId/population` — Population
**Type:** Style
- Population group cards: replace flat cards with wooden frame cards with group images
- Donut chart: recolor to match palette (gold, copper, sea-blue, mossy green)
- Edit modal: parchment dialog

---

### `/islands/:islandId/treasury` — Treasury ✅
**Files:** `src/views/TreasuryPage.vue`, `src/components/TreasuryChestCard.vue`, `src/components/TreasuryTransactions.vue`

**Implemented:**
- Page header: treasure-chest icon + Cinzel title; income/expense totals as green/red badge row (arrows + "зм" suffix)
- Chest card: dark surface + chest image right-aligned; left side gradient fade for text legibility; balance in `wi-number` (Cinzel Decorative), large clamp font size; italic "золотих монет" subtitle; "ВНЕСТИ" hint fades to gold on hover; border glows gold on hover
- Chest dialog: gold-bordered dark parchment card; Cinzel header with mode label + balance chip; gold gradient mode toggle (Внести/Зняти) for admin; quick-amount chips (gold tonal); feather icon on comment field; error shown with `mdi-skull-crossbones`; `fullscreen` on mobile
- Transactions: "Книга транзакцій" ledger card; dark header with scroll icon; table with uppercase Cinzel column headers; alternating row tint; deposit = green badge, withdraw = red badge; balance-after column in Cinzel Decorative gold; comment column truncates with ellipsis + full text on `title`

---

### `/islands/:islandId/manufactures` — Manufactures
**Type:** Style
- Cards styled as harbour invoice slips
- Income badge: gold coin chip
- Destination (treasury/guild): anchor icon (treasury) vs crossed-swords icon (guild)

---

### `/ships` — Ships ✅
**Files:** `src/views/ShipsView.vue`, `src/components/ShipCard.vue`, `src/components/ShipDetailsDialog.vue`

**Implemented:**
- Page header: sail icon + Cinzel gold heading, gold-bordered "Спорядити судно" button, divider line
- Ship cards (`ShipCard.vue`): `cols="12" sm="6" md="4"` grid; dark ocean gradient image background; sea-sway hover animation (`translateY(-4px) rotate(-0.4deg)`); gold border on hover
- Image section: 220px height, `object-fit: contain`, slight zoom on hover, description fades in as full overlay on hover (`overflow-y: auto` to handle long text)
- Info panel: Cinzel gold ship name with text-shadow glow; stats row (crew/passengers icons); hull dice row (green `mdi-cube-outline` = ok, red = used); custom HP bar (gradient fill: green/amber/red based on % thresholds); meta row (type/speed/size)
- Weapon badges: top-right corner of image, one circular badge per `weaponSlots` entry (no deduplication), dark bg + gold border + gold icon; tooltip shows weapon name
- Weapon icon map (all verified in MDI 7.4.47):

| Weapon key | Icon |
|---|---|
| `cannon` | `mdi-bomb` |
| `ballista` | `mdi-bow-arrow` |
| `catapult` | `mdi-bullseye-arrow` |
| `salamander` | `mdi-fire` |
| `dragon head` | `mdi-skull-crossbones` |
| `arcana-tillery` | `mdi-auto-fix` |
| `creature launcher` | `mdi-paw` |
| `oar blade` | `mdi-sword-cross` |
| `auroch ram` | `mdi-axe-battle` |

- Ship details dialog (`ShipDetailsDialog.vue`): redesigned as 4-tab layout — **Стан** (current values + description), **Характеристики** (limits/speed/size), **Зброя** (weapon slots), **Боєприпаси** (ammo); Cinzel header with ship name + gold border; `variant="outlined" density="compact"` on all fields; `fullscreen` on mobile (`$vuetify.display.smAndDown`); gold "Зберегти" button, muted "Закрити" button; resets to Стан tab on open

---

### `/donations` — Donation Goals
**Type:** Style
- Cards styled as wanted-poster or bounty-board notices (torn edge, parchment)
- Progress bar: filled with gold coins visual
- "Create" → "Post Bounty"

---

### `/religion` — Religion
**Type:** Style + UX
- Section headers with deity symbol placeholders
- Distribution diagram: recolor + add ornamental frame
- Table rows: alternating parchment/linen stripes
- Action modals: ceremonial/scroll aesthetic
- Celestial view: dark star-map inspired background panel

---

### `/travel` — Travel (Ship + Courier Calculators)
**Type:** Style + UX
- Tabs → "By Sea" / "By Land" with wave/road icons
- Ship calculator: styled as a nautical chart panel
- Courier calculator: styled as a road map panel
- Results displayed as stamped "Estimated Journey" readout

---

### `/guilds` — Guilds
**Type:** Style
- Guild cards: crest/shield placeholder left of name
- Treasure balance: gold coin badge
- Deposit/withdraw dialogs: brass-bordered transaction ledger style

---

### `/mage-guild` — Mage Guild
**Type:** Style
- Spell request cards: arcane parchment scroll with level-color glowing border
- Level avatars: styled as spell circle badges
- History expansion panels: collapsed scroll appearance

---

### `/crafting` — Crafting
**Type:** Style + UX
- Progress bars: styled as crafting anvil progress meters
- Category headers: tooled leather tab dividers
- Item mastery: stamped "MASTERED" seal on completed items
- Price calculator: apothecary ledger style panel

---

### `/admin` — Admin
**Type:** Style (minimal — admin-only, lower priority)
- Keep functional, apply global theme only

---

## Navbar
**Type:** Style + UX
- Replace flat app bar with a dark mahogany ship-railing style bar
- Icons → replace generic MDI with thematic ones:
  - Ships → `mdi-sail-boat`
  - Islands → `mdi-island`
  - Donations → `mdi-treasure-chest` or `mdi-hand-coin`
  - Religion → `mdi-candle`
  - Travel → `mdi-compass`
  - Guilds → `mdi-shield-sword`
  - Mage Guild → `mdi-magic-staff`
  - Crafting → `mdi-anvil`
- Mobile drawer: styled as a ship's manifest scroll
- Login/logout: "Board Ship" / "Abandon Ship"

---

## Implementation Order & Status

| # | Step | Status |
|---|---|---|
| 1 | **Global Vuetify theme** — colors, dark mode (`src/main.js`) | ✅ done |
| 2 | **Global CSS** — fonts, card/button overrides, textures (`src/styles/theme.css`) | ✅ done |
| 3 | **Navbar** — visible on every page, high impact | ✅ done |
| 4 | **Login page** — first impression | ✅ done |
| 5 | **Ships page** — most visually rich, good test bed | ✅ done |
| 6 | **Treasury page** — chest animation, ledger styling | ✅ done |
| 7 | **Island shell + Info** — core navigation | ✅ done |
| 8 | **Buildings** — map pins | ✅ done |
| 9 | **Population, Manufactures** — cards | ✅ done |
| 10 | **Donations, Guilds, Mage Guild** — cards + dialogs | ✅ done |
| 11 | **Religion** — most complex, multiple sub-views | ✅ done |
| 12 | **Crafting** — tables + progress | ✅ done |
| 13 | **Travel** — calculators | ✅ done |
| 14 | **Admin** — minimal, last | ✅ done |
| 15 | **Design system skill** — create `.claude/skills/west-islands-style/SKILL.md` | ✅ done |

**Legend:** ⬜ todo · 🔄 in progress · ✅ done

---

## Mobile Requirements

All pages must be fully functional on mobile (320px–768px). Vuetify's grid system (`v-col` breakpoints) is the primary tool. Key rules:

- **Navigation:** Navbar collapses to a hamburger drawer on mobile — already exists, needs pirate styling
- **Cards & grids:** Single-column on mobile (`cols="12"`), multi-column on desktop
- **Dialogs:** Full-screen on mobile (`fullscreen` prop on `v-dialog` at `xs`/`sm`)
- **Tables:** Horizontally scrollable or converted to stacked card layout on mobile
- **Typography:** Headings scale down — Cinzel looks good at smaller sizes but test at 320px
- **Touch targets:** Buttons and interactive elements minimum 44×44px
- **Buildings map:** Pinch-zoom or scroll-based navigation on mobile for the island map
- **Treasure chest animation:** Ensure tap (not hover) triggers the open/close on mobile

Each page entry in the Page Inventory implicitly includes mobile layout. Call out mobile-specific decisions per page only when they differ from the desktop approach.

---

## Out of Scope (for now)
- No framework swap (staying on Vuetify)
- No animation libraries (CSS only)
- No data model or Firestore changes

---

## Step 15 — Design System Skill

After all pages are redesigned, create `.claude/skills/west-islands-style/SKILL.md` — a self-contained design system reference that future Claude sessions must follow when adding any new feature or component. It should cover:

- Color palette (exact hex values + role)
- Typography (font names, usage per role)
- Component patterns (how cards, dialogs, buttons, tables, forms look in this system)
- Pirate vocabulary (thematic label/button names, icon mappings)
- Mobile rules (breakpoints, dialog behavior, touch targets)
- Do/don't examples (e.g. "don't use default Vuetify blue", "always use Cinzel for headings")

This skill is the living spec — update it whenever a new pattern is established during the redesign.
