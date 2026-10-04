import { useMemo, useState } from 'react'
import MapView from './components/MapView.jsx'
import Sidebar from './components/Sidebar.jsx'
import { findRoute } from './lib/graph.js'

export default function App() {
  const [fromId, setFromId] = useState(null)
  const [toId, setToId] = useState(null)
  const [hoverId, setHoverId] = useState(null)
  const [showRoads, setShowRoads] = useState(false)
  const [focus, setFocus] = useState(null)

  const route = useMemo(() => (fromId && toId ? findRoute(fromId, toId) : null), [fromId, toId])
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

  const clear = () => {
    setFromId(null)
    setToId(null)
  }

  return (
    <div className="app">
      <Sidebar
        fromId={fromId}
        toId={toId}
        route={route}
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
        showRoads={showRoads}
        focus={focus}
        onPick={pick}
        onHover={setHoverId}
      />
    </div>
  )
}
