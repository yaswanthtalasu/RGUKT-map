# RGUKT Nuzvid – Campus Navigator

Interactive campus map. Pick a **start** and a **destination** (tap the dots on the map or use the dropdowns) and the shortest walking route is drawn along the campus roads, with distance, walk time and a step-by-step list of stops.

- Satellite map with pan, scroll/pinch zoom and zoom buttons
- Click a dot → start, click another → destination, click again → start over
- Dijkstra shortest path over a road graph; the route line follows the real road bends
- "Popular routes" shortcuts (Gate → SAC, Gate → Food Stalls, …) and a "Show road network" debug toggle
- Works on phones (map on top, route panel as a bottom sheet)

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Editing the map

Everything lives in [`src/data/campus.js`](src/data/campus.js):

- `NODES` – every dot: `{ id, name, type, x, y }` with pixel coordinates on `public/campus-map.jpg` (1600 × 1107).
  `type` is `gate | building | ground | junction`, or `hidden` for invisible road joints.
- `EDGES` – roads as `[fromId, toId, [[x, y], …]]`. The optional list of points are the bends the road takes between the two dots.
- `METERS_PER_PIXEL` – rough scale used for the distance / walk-time estimate. Calibrate it against a known distance.

Turn on **Show road network** in the panel to see the graph drawn over the satellite image while you tweak it.
