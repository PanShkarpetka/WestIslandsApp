# BuildingsPage

Route: `/islands/:islandId/buildings` (child of IslandsPage).

## Purpose
Island map page. LegendKeeper owns the current island map and pins; this app only embeds that map.

## Map embed
The page renders an iframe to:

`https://www.legendkeeper.com/p/cma2mu1j719h60zl9frefc3wl/o3dmcy3m`

The embed is the primary map surface. No local island image, hardcoded pin coordinates, building detail panels, or `IslandBuildingDialog` pin interactions are used here anymore. The page also provides an external-open action for cases where the embedded LegendKeeper view is unavailable.

## Local data
No local building data is rendered on this tab. App-managed supplier buildings live on [`YieldBuildingsPage.md`](YieldBuildingsPage.md).

## Constraints
- Do not reintroduce local map pins or standard building detail/edit dialogs.
- Keep LegendKeeper as the source of truth for map markers.
