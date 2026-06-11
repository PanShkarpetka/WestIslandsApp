# TravelView — Кораблі tab

Component: `ShipCalculator` (`src/components/ShipCalculator.vue`)

## Purpose
Calculates ship travel costs, journey duration, and hazard checks for a sea route between two points.

## Key inputs/outputs (read the component for exact fields)
Inputs typically include: ship type/speed, distance, crew modifiers.  
Output: travel time, cost, risk level.

## Notes
- Self-contained component — no Pinia store, no Firestore reads
- All logic is client-side calculation
- Rendered inside `v-window-item value="ships"` in TravelView
- Weapon hazard reduction uses typed ship weapons: `cannon` counts as 1 reduction unit, `ballista` counts as 0.5. Ships without typed `weaponSlots` fall back to legacy `weaponSlotsUsed`.
