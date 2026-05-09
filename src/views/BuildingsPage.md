# BuildingsPage

Route: `/islands/:islandId/buildings` (child of IslandsPage).

## Purpose
Interactive island map with clickable building pins. Each pin represents a building slot; clicking opens `IslandBuildingDialog` for details or admin actions.

## Building pins
21 hardcoded pins with pixel-precise `top`/`left` positions on an 800px-wide map image. Each pin has:
- `id` — building key (e.g., `arcaneStudy`, `harbor`, `lighthouse`)
- `top`, `left` — absolute px offset on the map
- `flipX` — mirrors the pin image horizontally (for portCrane, shipyardBig)

Pin images: `/images/buildings/{id}.png`  
Map image: `/images/island/{DEFAULT_ISLAND_ID}.jpg`

## Built vs unbuilt state
`island.value.buildings` is a map of `{ [buildingKey]: { built: boolean } }`. Built pins glow gold; unbuilt pins are grayscale/faded. Hovering any pin scales it to 2.1× with a gold border.

## Dialog
`IslandBuildingDialog` receives:
- `building-key` — the clicked pin id
- `nickname` — from `userStore`
- `is-admin` — from `userStore`

## Stores
- `islandStore` — island data (subscribed by parent IslandsPage)
- `buildingStore` — building metadata (`byId` map for names)
- `donationGoalStore` — subscribed by parent, available here

## Adding a new building
1. Add pin entry to the `pins` array with correct coordinates and id
2. Add building image to `/public/images/buildings/{id}.png`
3. Update `buildingStore` data and Firestore schema if needed
