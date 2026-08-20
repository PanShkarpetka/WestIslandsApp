# ReligionPage

Route: `/religion` — `requiresAuth: false`.

## Purpose
Shows religion distribution, faith stats, and clergy abilities for the island. Has 4 view modes toggled via `v-btn-toggle`. See sub-files for each mode.

## View modes
| Value | Label | Component/content | Sub-file |
|-------|-------|-------------------|----------|
| `diagram` | Діаграма | `ReligionDistributionDiagram` | [DiagramView.md](ReligionPage/DiagramView.md) |
| `table` | Таблиця | `ReligionDistributionTable` | [TableView.md](ReligionPage/TableView.md) |
| `abilities` | Здібності | `ReligionAbilitiesTable` | [AbilitiesView.md](ReligionPage/AbilitiesView.md) |
| `celestial` | Небожитель | `ReligionModals` | [CelestialView.md](ReligionPage/CelestialView.md) |

Default view: `diagram`.

## Stores & services
- `useReligionStore` (or direct Firestore) — religion records, clergy, faith distribution
- `usePopulationStore` — total island population for percentage calculations
- `useIslandStore` — current island context
- `src/utils/religionActions.js` — canonical defense shield and spread-religion formulas

## UI shell
`WiPageHeader` provides the shared page hierarchy. The existing religion card and `v-btn-toggle` remain unchanged; loading, error, and empty states use `WiEmptyState`. Toggle label text is hidden on small screens (`.toggle-label` has responsive display).

The distribution and clergy tables expose both base confession DC and shielded DC where relevant. Spread-religion admin previews show base DC, shielded DC, current shield, expected shield damage, and remaining shield.

## Religion action mechanics
- Passive building OV is distributed automatically on cycle start by `distributeBuildingFaithIncome()` and is shared across all clergy in the confession. Heroes cannot refuse or opt out of this passive building OV source.
- Defense action uses `calculateDefenseShieldBonus(result, dc)`: success at DC gives shield `+1`, then another `+1` for each full 4 points over DC.
- A confession cannot activate a new shield while the old shield is active. The page disables the button and the Firestore transaction rejects stale submissions.
- Spread religion uses `calculateSpreadReligionOutcome({ result, baseDC, shieldBonus })`. Base DC is `svBase + svTemp + DM Mod`; shielded DC is `baseDC + shieldBonus`.
- A result at or above shielded DC converts followers and removes the shield. Converted followers are `5 + max(0, result - shieldedDC)`.
- A result at or above base DC but below shielded DC converts no followers and damages the shield by `result - baseDC + 1`.
- A result below base DC converts no followers and leaves the shield unchanged.
- Spread resolution increments the target religion's `svTemp` by 1, even when only the shield was damaged.
- Formula examples are covered in `tests/utils/religionActions.test.js`.

## Components imported
- `ReligionDistributionDiagram`
- `ReligionDistributionTable`
- `ReligionAbilitiesTable`
- `ReligionModals`
