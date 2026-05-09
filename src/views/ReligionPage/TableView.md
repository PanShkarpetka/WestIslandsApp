# ReligionPage — Таблиця view

Component: `ReligionDistributionTable` (`src/components/ReligionDistributionTable.vue`)

## Purpose
Tabular breakdown of religion data. Shows each religion's name, hero clergy, faith points, faith max, and follower counts with percentage.

## Admin behavior
Admins can edit faith values and follower counts inline or via dialog (check the component for exact pattern).

## Notes
- Rendered when `viewMode === 'table'`
- Receives the same religion records as the diagram view
