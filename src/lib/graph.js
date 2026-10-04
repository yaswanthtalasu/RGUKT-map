import { NODES, EDGES, ALTERNATES, METERS_PER_PIXEL, WALK_METERS_PER_MIN } from '../data/campus.js'

export const nodeById = Object.fromEntries(NODES.map((n) => [n.id, n]))

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

function polylineLength(pts) {
  let len = 0
  for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i])
  return len
}

// Each edge becomes two directed adjacency entries carrying the full road geometry.
const adjacency = {}
export const roads = EDGES.map(([a, b, via = []]) => {
  const A = nodeById[a]
  const B = nodeById[b]
  const pts = [[A.x, A.y], ...via, [B.x, B.y]]
  const length = polylineLength(pts)
  ;(adjacency[a] ||= []).push({ to: b, length, pts })
  ;(adjacency[b] ||= []).push({ to: a, length, pts: [...pts].reverse() })
  return { a, b, pts, length }
})

/** Dijkstra over the road graph. Returns null when no route exists. */
export function findRoute(fromId, toId) {
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
      const d = best[cur] + edge.length
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
    stops: stops.map((s) => ({ ...s, node: nodeById[s.id], meters: Math.round(s.atPx * METERS_PER_PIXEL) })),
    meters,
    minutes: Math.max(1, Math.round(meters / WALK_METERS_PER_MIN)),
  }
}

/** Dotted alternative for routes listed in ALTERNATES: shortest path A -> via -> B. */
export function findAlternative(fromId, toId) {
  const alt = ALTERNATES.find(
    ({ between: [a, b] }) => (a === fromId && b === toId) || (a === toId && b === fromId),
  )
  if (!alt) return null
  const first = findRoute(fromId, alt.via)
  const second = findRoute(alt.via, toId)
  if (!first || !second) return null
  return { points: [...first.points, ...second.points.slice(1)], via: nodeById[alt.via] }
}

export const pointsToPath = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')
