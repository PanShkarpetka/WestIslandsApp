# TravelView — Кур'єри tab

Component: `CourierCalculator` (`src/components/CourierCalculator.vue`)

## Purpose
Calculates courier (messenger bird) delivery time and cost between locations.

## Notes
- Self-contained component — no Pinia store, no Firestore reads
- All logic is client-side calculation
- Rendered inside `v-window-item value="couriers"` in TravelView
- Form and journey history use shared `WiPanel` surfaces and `WiActionButton` controls.
- Login visibility is reactive; test/send calculations and saved log fields are unchanged.
