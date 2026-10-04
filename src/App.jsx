import { useEffect, useMemo, useState } from 'react'
import MapView from './components/MapView.jsx'
import Sidebar from './components/Sidebar.jsx'
import { LIVE_ID, clearLiveStart, findAlternative, findRoute, setLiveStart } from './lib/graph.js'
import useLiveLocation from './lib/useLiveLocation.js'

export default function App() {
  const [fromId, setFromId] = useState(null)
  const [toId, setToId] = useState(null)
  const [hoverId, setHoverId] = useState(null)
  const [showRoads, setShowRoads] = useState(false)
  const [focus, setFocus] = useState(null)
  const [fullscreen, setFullscreen] = useState(false)

  // "My live location" is a special start: watch GPS while it is selected.
  const liveOn = fromId === LIVE_ID
  const { status: liveStatus, fix, km: liveKm } = useLiveLocation(liveOn)
  const liveSnap = useMemo(() => {
    if (liveOn && fix) return setLiveStart(fix.x, fix.y)
    clearLiveStart()
    return null
  }, [liveOn, fix])
  const live = liveOn ? { status: liveStatus, fix, snap: liveSnap, km: liveKm } : null

  // First fix with no destination yet: show the student where they are.
  const hadSnap = liveSnap !== null
  useEffect(() => {
    if (hadSnap && !toId) setFocus({ id: LIVE_ID, n: Date.now() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hadSnap])

  const route = useMemo(
    () => (fromId && toId && (!liveOn || liveSnap) ? findRoute(fromId, toId) : null),
    [fromId, toId, liveOn, liveSnap],
  )
  const alt = useMemo(() => (fromId && toId ? findAlternative(fromId, toId, route) : null), [fromId, toId, route])
  const noRoute = fromId && toId && !route && (!liveOn || liveSnap)

  // Map clicks: 1st = start, 2nd = destination, 3rd starts over with a new start.
  const pick = (id) => {
    if (!fromId || (fromId && toId)) {
      setFromId(id)
      setToId(null)
    } else if (id !== fromId) {
      setToId(id)
    }
  }

  const swap = () => {
    if (liveOn) return
    setFromId(toId)
    setToId(fromId)
  }

  // Full view: hide the side panel and, where the browser allows it, go real fullscreen.
  const toggleFullscreen = () => {
    const next = !fullscreen
    setFullscreen(next)
    try {
      if (next) document.documentElement.requestFullscreen?.()?.catch(() => {})
      else if (document.fullscreenElement) document.exitFullscreen()
    } catch {
      /* not supported (e.g. iPhone Safari) – the panel-less full view still works */
    }
  }

  // Esc / browser UI leaving fullscreen should also leave our full view.
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setFullscreen(false)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const clear = () => {
    setFromId(null)
    setToId(null)
  }

  return (
    <div className={`app${fullscreen ? ' is-fullscreen' : ''}`}>
      <Sidebar
        fromId={fromId}
        toId={toId}
        route={route}
        alt={alt}
        live={live}
        noRoute={noRoute}
        showRoads={showRoads}
        onFrom={setFromId}
        onTo={setToId}
        onSwap={swap}
        onClear={clear}
        onToggleRoads={() => setShowRoads((v) => !v)}
        onFocus={(id) => setFocus({ id, n: Date.now() })}
        onQuick={(a, b) => {
          setFromId(a)
          setToId(b)
        }}
      />
      <MapView
        fromId={fromId}
        toId={toId}
        hoverId={hoverId}
        route={route}
        alt={alt}
        live={live}
        routeKey={`${fromId}|${toId}|${route ? 1 : 0}`}
        showRoads={showRoads}
        focus={focus}
        fullscreen={fullscreen}
        onToggleFullscreen={toggleFullscreen}
        onClear={clear}
        onPick={pick}
        onHover={setHoverId}
      />
    </div>
  )
}
