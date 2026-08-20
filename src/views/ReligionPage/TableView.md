# ReligionPage — Таблиця view

Component: `ReligionDistributionTable` (`src/components/ReligionDistributionTable.vue`)

## Purpose
Tabular breakdown of confession-level religion data. Shows each religion's name, followers, hero clergy count, population share, building level, passive building OV, SV values, active shield, base target DC, shielded target DC, farm base/DC, and minimum spread-follower result.

## Admin behavior
Rows are selectable. Admins can open the follower distribution dialog from a selected confession slice/row and can manage clergy actions through the clergy table below the distribution section.

## Notes
- Rendered when `viewMode === 'table'`
- Component: `ReligionDistributionTable`
- Receives the `distribution` array computed in `ReligionPage.vue`
- `targetDCBase` is `svBase + svTemp`
- `targetDCWithShield` is `targetDCBase + shieldBonus` only when `shieldActive`
- Shield display is read-only in this table; shield changes happen through the admin clergy modal
