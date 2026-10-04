import { NODES, EDGES, ALTERNATES, NO_ALTERNATE_EDGES, METERS_PER_PIXEL, WALK_METERS_PER_MIN } from '../data/campus.js'

export const nodeById = Object.fromEntries(NODES.map((n) => [n.id, n]))

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

function polylineLength(pts) {
  let len = 0
  for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i])
  return len
}

// Each edge becomes two directed adjacency entries carrying the full road geometry.
const adjacency = {}
export const roads = EDGES.map(([a, b, via = [], cost = 1]) => {
  const A = nodeById[a]
  const B = nodeById[b]
  const pts = [[A.x, A.y], ...via, [B.x, B.y]]
  const length = polylineLength(pts)
  const key = [a, b].sort().join('|')
  ;(adjacency[a] ||= []).push({ to: b, length, pts, key, cost })
  ;(adjacency[b] ||= []).push({ to: a, length, pts: [...pts].reverse(), key, cost })
  return { a, b, pts, length, cost }
})

/**
 * Dijkstra over the road graph. Returns null when no route exists.
 * `avoid` (Set of edge keys) + `avoidFactor` make those roads more expensive,
 * which is how alternative routes are found. `blocked` roads are not used at all.
 */
export function findRoute(fromId, toId, avoid = null, avoidFactor = 1, blocked = null) {
  if (!nodeById[fromId] || !nodeById[toId]) return null
  const best = { [fromId]: 0 }
  const prev = {}
  const todo = new Set([fromId])

  while (todo.size) {
    let cur = null
    for (const id of todo) if (cur === null || best[id] < best[cur]) cur = id
    todo.delete(cur)
    if (cur === toId) break
    for (const edge of adjacency[cur] || []) {
      if (blocked?.has(edge.key)) continue
      const d = best[cur] + edge.length * edge.cost * (avoid?.has(edge.key) ? avoidFactor : 1)
      if (d < (best[edge.to] ?? Infinity)) {
        best[edge.to] = d
        prev[edge.to] = { from: cur, edge }
        todo.add(edge.to)
      }
    }
  }
  if (best[toId] === undefined) return null

  const legs = []
  for (let id = toId; id !== fromId; id = prev[id].from) legs.unshift(prev[id])

  const points = [[nodeById[fromId].x, nodeById[fromId].y]]
  const stops = [{ id: fromId, atPx: 0 }]
  let travelled = 0
  for (const { edge } of legs) {
    points.push(...edge.pts.slice(1))
    travelled += edge.length
    stops.push({ id: edge.to, atPx: travelled })
  }

  const meters = Math.round((travelled * METERS_PER_PIXEL) / 10) * 10
  return {
    points,
    edgeKeys: legs.map(({ edge }) => edge.key),
    px: travelled,
    stops: stops.map((s) => ({ ...s, node: nodeById[s.id], meters: Math.round(s.atPx * METERS_PER_PIXEL) })),
    meters,
    minutes: Math.max(1, Math.round(meters / WALK_METERS_PER_MIN)),
  }
}

const edgeLength = Object.fromEntries(roads.map((r) => [[r.a, r.b].sort().join('|'), r.length]))

// An alternative must really differ from the main route, and not be a huge detour.
const MIN_UNIQUE_PX = 120
const MAX_DETOUR = 2.2

/** A hand-picked alternative from ALTERNATES: shortest path A -> via -> B. */
function preferredAlternative(fromId, toId) {
  const alt = ALTERNATES.find(
    ({ between: [a, b] }) => (a === fromId && b === toId) || (a === toId && b === fromId),
  )
  if (!alt) return null
  const first = findRoute(fromId, alt.via)
  const second = findRoute(alt.via, toId)
  if (!first || !second) return null
  return { points: [...first.points, ...second.points.slice(1)], via: nodeById[alt.via] }
}

/**
 * Dotted alternative for ANY pair: re-run the search with the main route's roads made
 * progressively more expensive until a clearly different path comes out.
 * Returns null when the road network has no real second option (e.g. dead-end spurs).
 */
export function findAlternative(fromId, toId, main = findRoute(fromId, toId)) {
  if (!main || fromId === toId) return null
  const preferred = preferredAlternative(fromId, toId)
  if (preferred) return preferred

  const used = new Set(main.edgeKeys)
  const blocked = new Set(NO_ALTERNATE_EDGES.map(([a, b]) => [a, b].sort().join('|')).filter((k) => !used.has(k)))
  for (const factor of [2, 4, 10]) {
    const alt = findRoute(fromId, toId, used, factor, blocked)
    if (!alt || alt.px > main.px * MAX_DETOUR) continue
    const unique = alt.edgeKeys.filter((k) => !used.has(k))
    const uniquePx = unique.reduce((sum, k) => sum + edgeLength[k], 0)
    if (uniquePx < MIN_UNIQUE_PX) continue

    // Name the alternative after a place it passes that the main route doesn't.
    const onMain = new Set(main.stops.map((s) => s.id))
    const fresh = alt.stops.filter((s) => !onMain.has(s.id) && s.node.type !== 'hidden')
    const via = fresh.length ? fresh[Math.floor((fresh.length - 1) / 2)].node : null
    return { points: alt.points, via }
  }
  return null
}

// ── Live location ────────────────────────────────────────────────────────────
// The user's position is snapped to the nearest road and becomes a temporary node
// 'me' that connects to both ends of that road, so every normal route/alternative
// search works from it unchanged.

export const LIVE_ID = 'me'

function nearestOnRoads(x, y) {
  let best = null
  for (const road of roads) {
    for (let i = 0; i < road.pts.length - 1; i++) {
      const [ax, ay] = road.pts[i]
      const [bx, by] = road.pts[i + 1]
      const dx = bx - ax
      const dy = by - ay
      const len2 = dx * dx + dy * dy
      const t = len2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2)) : 0
      const sx = ax + dx * t
      const sy = ay + dy * t
      const d = Math.hypot(x - sx, y - sy)
      if (!best || d < best.d) best = { d, road, i, snap: [sx, sy] }
    }
  }
  return best
}

export function clearLiveStart() {
  delete nodeById[LIVE_ID]
  delete adjacency[LIVE_ID]
  for (const k of Object.keys(edgeLength)) if (k.startsWith(`${LIVE_ID}|`)) delete edgeLength[k]
}

/** Snap {x, y} (map pixels) onto the road network and make it routable as 'me'. */
export function setLiveStart(x, y) {
  clearLiveStart()
  const hit = nearestOnRoads(x, y)
  if (!hit) return null
  const { road, i, snap } = hit
  const back = [snap, ...road.pts.slice(0, i + 1).reverse()] // snap -> road.a
  const fwd = [snap, ...road.pts.slice(i + 1)] // snap -> road.b
  nodeById[LIVE_ID] = { id: LIVE_ID, name: 'My location', type: 'live', x: snap[0], y: snap[1] }
  adjacency[LIVE_ID] = [
    { to: road.a, pts: back, length: polylineLength(back), key: `${LIVE_ID}|${road.a}`, cost: road.cost },
    { to: road.b, pts: fwd, length: polylineLength(fwd), key: `${LIVE_ID}|${road.b}`, cost: road.cost },
  ]
  for (const e of adjacency[LIVE_ID]) edgeLength[e.key] = e.length
  return { snap: { x: snap[0], y: snap[1] }, distance: hit.d }
}

export const pointsToPath = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')
