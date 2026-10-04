import { useEffect, useMemo, useState } from 'react'
import MapView from './components/MapView.jsx'
import Sidebar from './components/Sidebar.jsx'
import { findAlternative, findRoute } from './lib/graph.js'

export default function App() {
  const [fromId, setFromId] = useState(null)
  const [toId, setToId] = useState(null)
  const [hoverId, setHoverId] = useState(null)
  const [showRoads, setShowRoads] = useState(false)
  const [focus, setFocus] = useState(null)
  const [fullscreen, setFullscreen] = useState(false)

  const route = useMemo(() => (fromId && toId ? findRoute(fromId, toId) : null), [fromId, toId])
  const alt = useMemo(() => (fromId && toId ? findAlternative(fromId, toId) : null), [fromId, toId])
  const noRoute = fromId && toId && !route

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
