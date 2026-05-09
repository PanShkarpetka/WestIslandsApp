# West Islands Design System

Pirate-themed Vue 3 + Vuetify 3 app. Always apply these conventions when building or restyling pages.

---

## CSS Custom Properties (from `src/styles/theme.css`)

| Token | Role |
|---|---|
| `--wi-gold` | Primary accent — headings, values, icons, active states |
| `--wi-text` | Main body text |
| `--wi-text-muted` | Labels, captions, secondary text |
| `--wi-border` | `rgba(90,62,32,~0.3)` — all card/table/divider borders |
| `--wi-font-heading` | Heading font (serif / display) |
| `--wi-font-body` | Body font |
| `--wi-surface` | Default card surface |

---

## Card Pattern

All cards use a dark parchment gradient background:

```css
.my-card {
  background: linear-gradient(135deg, rgba(14,9,4,0.9), rgba(26,17,8,0.85)) !important;
  border: 1px solid var(--wi-border) !important;
  border-radius: 12px;
}
```

Use `elevation="0"` on Vuetify cards — borders replace elevation shadows.

---

## Hero / Page Banner

```css
.hero-banner {
  background: linear-gradient(135deg, rgba(12,8,4,0.92), rgba(30,18,6,0.88));
  border: 1px solid var(--wi-border);
  border-radius: 16px;
  padding: 32px 40px;
}
.hero-banner h1 {
  font-family: var(--wi-font-heading);
  color: var(--wi-gold);
  letter-spacing: 0.04em;
}
.hero-banner p {
  font-family: var(--wi-font-body);
  color: var(--wi-text-muted);
  font-style: italic;
}
```

---

## Section Labels (inside cards)

```css
.section-label {
  font-family: var(--wi-font-heading);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--wi-text-muted);
}
```

Page-level section headings (`v-card-title`) inside a main card are smaller uppercase muted labels — NOT gold. Only the page title / hero uses gold.

---

## Table Headers & Rows

All `v-table` and `v-data-table` instances:

```css
:deep(thead tr th) {
  font-family: var(--wi-font-heading) !important;
  font-size: 0.68rem !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase;
  color: var(--wi-text-muted) !important;
  background: #1a1108 !important;
  border-bottom: 1px solid var(--wi-border) !important;
}
:deep(tbody tr td) {
  color: var(--wi-text);
  font-family: var(--wi-font-body);
  border-bottom: 1px solid rgba(90,62,32,0.25) !important;
  background: transparent !important;
}
```

Fix Vuetify double-scrollbar (nested `v-table` inside scrollable wrapper):
```css
:deep(.v-table__wrapper) { overflow: visible; }
```

---

## Spacing Between Sections

Use `mb-5` (20px) consistently between all major sections/cards on a page.

---

## Metric / Stat Cards

```html
<v-card class="metric-card" rounded="lg">
  <v-card-text>
    <div class="metric-label">Label</div>
    <div class="metric-value">42</div>
    <div class="metric-subtext">Supporting text</div>
  </v-card-text>
</v-card>
```

```css
.metric-card {
  background: linear-gradient(135deg, rgba(14,9,4,0.9), rgba(26,17,8,0.85)) !important;
  border: 1px solid var(--wi-border) !important;
}
.metric-label { font-family: var(--wi-font-heading); font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--wi-text-muted); }
.metric-value { font-family: var(--wi-font-heading); font-size: 2rem; font-weight: 700; color: var(--wi-gold); }
.metric-subtext { font-family: var(--wi-font-body); font-size: 0.72rem; color: var(--wi-text-muted); }
```

---

## Expansion Panels

```css
:deep(.v-expansion-panels) {
  border: 1px solid var(--wi-border);
  border-radius: 12px !important;
  overflow: hidden;
}
:deep(.v-expansion-panel-title) {
  font-family: var(--wi-font-heading);
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--wi-gold);
  background: rgba(14,9,4,0.9);
  padding: 16px 20px;
}
:deep(.v-expansion-panel-text__wrapper) {
  background: rgba(10,6,2,0.85);
  padding: 16px 20px;
}
```

---

## Inactive Row Indicator (tables)

Use a CSS cross-hatch (NOT opacity, NOT color dimming):

```css
.row--inactive {
  background-image:
    repeating-linear-gradient(45deg, rgba(90,62,32,0.38) 0px, rgba(90,62,32,0.38) 1px, transparent 1px, transparent 9px),
    repeating-linear-gradient(-45deg, rgba(90,62,32,0.38) 0px, rgba(90,62,32,0.38) 1px, transparent 1px, transparent 9px);
}
```

---

## Active Chip Glow

```css
.chip--active {
  animation: chip-glow 2.2s ease-in-out infinite;
}
@keyframes chip-glow {
  0%, 100% { box-shadow: 0 0 4px 1px color-mix(in srgb, var(--chip-glow, #c8962a) 55%, transparent); }
  50%       { box-shadow: 0 0 12px 3px color-mix(in srgb, var(--chip-glow, #c8962a) 90%, transparent); }
}
```

Pass `--chip-glow: <religionColor>` via `:style` for color-matched glow.

---

## Dialogs

```css
:deep(.v-overlay .v-card) {
  background: linear-gradient(135deg, rgba(14,9,4,0.98), rgba(26,17,8,0.95)) !important;
  border: 1px solid var(--wi-border) !important;
}
:deep(.v-overlay .v-card-title) {
  font-family: var(--wi-font-heading) !important;
  color: var(--wi-gold) !important;
  letter-spacing: 0.04em;
}
```

Always use `scrim="rgba(6,12,32,0.78)"` on `v-dialog`.

---

## Vuetify Component Notes

- `v-btn` primary actions: `color="primary"` with the pirateTheme maps to gold
- Never use `variant="tonal"` on `v-card` — it conflicts with dark backgrounds; use explicit CSS instead
- `display: flex` on `<td>` breaks table layout in Chrome — always wrap flex content in an inner `<div>`
- `v-data-table` uses `v-data-table-footer` for pagination; style it with `border-top: 1px solid var(--wi-border)`
