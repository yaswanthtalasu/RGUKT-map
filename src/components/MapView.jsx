import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { MAP_SIZE, NODES } from '../data/campus.js'
import { pointsToPath, roads } from '../lib/graph.js'

const { width: W, height: H } = MAP_SIZE
const MAX_K = 5
const VISIBLE_NODES = NODES.filter((n) => n.type !== 'hidden')
const TYPE_COLOR = {
  gate: '#7c3aed',
  building: '#0f766e',
  ground: '#b45309',
  junction: '#475569',
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const ease = (t) => 1 - Math.pow(1 - t, 3)

export default function MapView({ fromId, toId, hoverId, route, showRoads, focus, onPick, onHover }) {
  const wrapRef = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [view, setView] = useState({ x: 0, y: 0, k: 1 })
  const viewRef = useRef(view)
  viewRef.current = view
  const tween = useRef(0)
  const pointers = useRef(new Map())
  const gesture = useRef({ moved: false, startDist: 0, startK: 1, lastMid: null })

  const minK = size.w ? Math.min(size.w / W, size.h / H) : 0.2

  // Keep the map inside the viewport (with a little slack so edge dots stay reachable).
  const constrain = useCallback(
    (v) => {
      const k = clamp(v.k, minK, MAX_K)
      const slack = 80
      const mw = W * k
      const mh = H * k
      const x = mw <= size.w ? (size.w - mw) / 2 : clamp(v.x, size.w - mw - slack, slack)
      const y = mh <= size.h ? (size.h - mh) / 2 : clamp(v.y, size.h - mh - slack, slack)
      return { x, y, k }
    },
    [minK, size.w, size.h],
  )

  const animateTo = useCallback(
    (target, ms = 650) => {
      cancelAnimationFrame(tween.current)
      const from = viewRef.current
      const to = constrain(target)
      const t0 = performance.now()
      const step = (now) => {
        const t = clamp((now - t0) / ms, 0, 1)
        const e = ease(t)
        setView({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, k: from.k + (to.k - from.k) * e })
        if (t < 1) tween.current = requestAnimationFrame(step)
      }
      tween.current = requestAnimationFrame(step)
    },
    [constrain],
  )

  // Overview: whole campus on wide screens; on phones fill the height and centre on the core.
  const overview = useCallback(() => {
    const k = size.w < 600 ? Math.max(minK, size.h / H) : minK
    return { k, x: size.w / 2 - 800 * k, y: 0 }
  }, [size.w, size.h, minK])

  const fitBox = useCallback(
    (x0, y0, x1, y1, pad = 90) => {
      const bw = Math.max(x1 - x0, 120) + pad * 2
      const bh = Math.max(y1 - y0, 120) + pad * 2
      const k = clamp(Math.min(size.w / bw, size.h / bh), minK, 2.4)
      const cx = (x0 + x1) / 2
      const cy = (y0 + y1) / 2
      return { k, x: size.w / 2 - cx * k, y: size.h / 2 - cy * k }
    },
    [size.w, size.h, minK],
  )

  // Track container size.
  useLayoutEffect(() => {
    const el = wrapRef.current
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // Initial fit / refit on resize when nothing is routed.
  const routeRef = useRef(route)
  routeRef.current = route
  useEffect(() => {
    if (!size.w) return
    cancelAnimationFrame(tween.current)
    const r = routeRef.current
    if (r) {
      const xs = r.points.map((p) => p[0])
      const ys = r.points.map((p) => p[1])
      setView(constrain(fitBox(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys))))
    } else {
      setView(constrain(overview()))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, size.h])

  // Fly to the route whenever a new one appears.
  useEffect(() => {
    if (!route || !size.w) return
    const xs = route.points.map((p) => p[0])
    const ys = route.points.map((p) => p[1])
    animateTo(fitBox(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route])

  // Fly to a single node (picked from the step list, or the first pick).
  useEffect(() => {
    if (!focus || !size.w) return
    const n = NODES.find((x) => x.id === focus.id)
    if (!n) return
    const k = Math.max(viewRef.current.k, 1.6)
    animateTo({ k, x: size.w / 2 - n.x * k, y: size.h / 2 - n.y * k }, 500)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus])

  const zoomAt = useCallback(
    (cx, cy, factor) => {
      const v = viewRef.current
      const k = clamp(v.k * factor, minK, MAX_K)
      const f = k / v.k
      setView(constrain({ k, x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f }))
    },
    [constrain, minK],
  )

  // Wheel zoom (needs a non-passive listener to stop page scroll).
  useEffect(() => {
    const el = wrapRef.current
    const onWheel = (e) => {
      e.preventDefault()
      cancelAnimationFrame(tween.current)
      const r = el.getBoundingClientRect()
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0018))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  // ── pointer pan / pinch ──────────────────────────────────────
  const onPointerDown = (e) => {
    cancelAnimationFrame(tween.current)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    g.moved = false
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      g.startDist = Math.hypot(a.x - b.x, a.y - b.y)
      g.startK = viewRef.current.k
      g.lastMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    }
  }

  const onPointerMove = (e) => {
    const p = pointers.current.get(e.pointerId)
    if (!p) return
    const g = gesture.current
    const dx = e.clientX - p.x
    const dy = e.clientY - p.y
    if (!g.moved && Math.hypot(dx, dy) < 5 && pointers.current.size === 1) return
    if (!g.moved) {
      g.moved = true
      wrapRef.current.setPointerCapture?.(e.pointerId)
    }
    p.x = e.clientX
    p.y = e.clientY

    if (pointers.current.size === 1) {
      const v = viewRef.current
      setView(constrain({ ...v, x: v.x + dx, y: v.y + dy }))
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      const r = wrapRef.current.getBoundingClientRect()
      const v = viewRef.current
      const k = clamp(g.startK * (d / g.startDist), minK, MAX_K)
      const f = k / v.k
      const cx = mid.x - r.left
      const cy = mid.y - r.top
      setView(
        constrain({
          k,
          x: cx - (cx - v.x) * f + (mid.x - g.lastMid.x),
          y: cy - (cy - v.y) * f + (mid.y - g.lastMid.y),
        }),
      )
      g.lastMid = mid
    }
  }

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId)
    wrapRef.current.releasePointerCapture?.(e.pointerId)
  }

  // ── derived drawing data ─────────────────────────────────────
  const { k } = view
  const routePath = useMemo(() => (route ? pointsToPath(route.points) : ''), [route])
  const routeLen = useMemo(() => {
    if (!route) return 0
    let len = 0
    for (let i = 1; i < route.points.length; i++) {
      len += Math.hypot(route.points[i][0] - route.points[i - 1][0], route.points[i][1] - route.points[i - 1][1])
    }
    return len
  }, [route])
  const onRoute = useMemo(() => new Set(route ? route.stops.map((s) => s.id) : []), [route])
  const byId = (id) => NODES.find((n) => n.id === id)
  const fromNode = fromId && byId(fromId)
  const toNode = toId && byId(toId)

  const labelFor = (n) =>
    n.id === fromId ||
    n.id === toId ||
    n.id === hoverId ||
    (route && onRoute.has(n.id) && n.type !== 'junction') ||
    (k >= 1.7 && n.type !== 'junction')

  const px = (v) => v / k // keep marks a constant on-screen size whatever the zoom

  return (
    <div className="map-wrap">
      <div
        className="map"
        ref={wrapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <svg
          className="world"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
        >
          <image href={`${import.meta.env.BASE_URL}campus-map.jpg`} width={W} height={H} />
          <rect width={W} height={H} fill="rgba(8, 24, 28, 0.1)" />

          {showRoads && (
            <g className="roads">
              {roads.map((r) => (
                <path key={r.a + r.b} d={pointsToPath(r.pts)} strokeWidth={px(3)} />
              ))}
            </g>
          )}

          {route && (
            <g key={routePath} className="route">
              <path d={routePath} className="route-casing" strokeWidth={px(10)} />
              <path
                d={routePath}
                className="route-line"
                pathLength="1"
                strokeWidth={px(6)}
                style={{ animationDuration: `${clamp(routeLen / 900, 0.6, 1.6)}s` }}
              />
              <path
                d={routePath}
                className="route-flow"
                strokeWidth={px(2.5)}
                strokeDasharray={`${px(2)} ${px(14)}`}
                style={{ '--dash': `${px(16)}` }}
              />
              <circle r={px(7)} className="route-walker">
                <animateMotion
                  dur={`${clamp(routeLen / 140, 3, 14)}s`}
                  repeatCount="indefinite"
                  path={routePath}
                  begin="1.2s"
                />
              </circle>
            </g>
          )}

          <g>
            {VISIBLE_NODES.map((n) => {
              const isFrom = n.id === fromId
              const isTo = n.id === toId
              const active = isFrom || isTo
              const r = active ? px(9) : onRoute.has(n.id) ? px(6.5) : n.type === 'junction' ? px(4.5) : px(6)
              return (
                <g
                  key={n.id}
                  className="node"
                  onClick={() => !gesture.current.moved && onPick(n.id)}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(n.id)}
                  onPointerLeave={() => onHover(null)}
                >
                  <circle cx={n.x} cy={n.y} r={px(16)} fill="transparent" />
                  {active && <circle cx={n.x} cy={n.y} r={px(16)} className={`pulse ${isFrom ? 'from' : 'to'}`} />}
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={r}
                    fill={isFrom ? '#16a34a' : isTo ? '#dc2626' : TYPE_COLOR[n.type]}
                    stroke="#fff"
                    strokeWidth={px(active ? 3 : 2)}
                  />
                </g>
              )
            })}
          </g>

          <g className="labels" pointerEvents="none">
            {VISIBLE_NODES.filter(labelFor).map((n) => {
              const active = n.id === fromId || n.id === toId
              const tag = n.id === fromId ? 'START · ' : n.id === toId ? 'END · ' : ''
              // keep labels on screen when a dot sits near the edge of the viewport
              const sx = view.x + n.x * k
              const anchor = sx > size.w - 130 ? 'end' : sx < 130 ? 'start' : 'middle'
              return (
                <text
                  key={n.id}
                  x={n.x + (anchor === 'end' ? px(10) : anchor === 'start' ? -px(10) : 0)}
                  y={n.y - px(active ? 16 : 11)}
                  fontSize={px(active ? 14 : 12)}
                  textAnchor={anchor}
                  className={active ? 'label strong' : 'label'}
                  strokeWidth={px(4)}
                >
                  {tag}
                  {n.name}
                </text>
              )
            })}
          </g>

          {fromNode && !toNode && (
            <text x={fromNode.x} y={fromNode.y + px(28)} fontSize={px(12)} textAnchor="middle" className="label hint" strokeWidth={px(4)} pointerEvents="none">
              Now pick a destination
            </text>
          )}
        </svg>
      </div>

      <div className="zoom-controls">
        <button className="zoom-btn" aria-label="Zoom in" onClick={() => zoomAt(size.w / 2, size.h / 2, 1.5)}>＋</button>
        <button className="zoom-btn" aria-label="Zoom out" onClick={() => zoomAt(size.w / 2, size.h / 2, 1 / 1.5)}>－</button>
        <button
          aria-label="Reset view"
          onClick={() => {
            if (route) {
              const xs = route.points.map((p) => p[0])
              const ys = route.points.map((p) => p[1])
              animateTo(fitBox(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)))
            } else animateTo(overview())
          }}
        >
          ⤢
        </button>
      </div>

      <div className="legend">
        <span><i style={{ background: TYPE_COLOR.gate }} />Gate</span>
        <span><i style={{ background: TYPE_COLOR.building }} />Building</span>
        <span><i style={{ background: TYPE_COLOR.ground }} />Ground</span>
        <span><i style={{ background: TYPE_COLOR.junction }} />Junction</span>
      </div>
    </div>
  )
}
