# ReligionPage — Діаграма view

Component: `ReligionDistributionDiagram` (`src/components/ReligionDistributionDiagram.vue`)

## Purpose
Donut/pie chart visualizing how the island's population is distributed across religions (as % of total followers and % of total population).

## Data expected from parent
- Religion records with follower counts
- Total island population (from `populationStore`)

## Notes
- Default view when the page loads (`viewMode` starts as `'diagram'`)
- Uses `chart.js` via `vue-chartjs`
