# ReligionPage — Здібності view

Component: `ReligionAbilitiesTable` (`src/components/ReligionAbilitiesTable.vue`)

## Purpose
Displays the divine abilities/boons unlocked per religion, gated by faith thresholds. Shows each religion's available abilities and which are currently active based on current faith level.

## Notes
- Rendered when `viewMode === 'abilities'`
- Read-only for all users (abilities are system-defined, not user-editable)
