import { NODES } from '../data/campus.js'

const byName = (a, b) => a.name.localeCompare(b.name)
const PLACES = NODES.filter((n) => n.type !== 'hidden' && n.type !== 'junction').sort(byName)
const JUNCTIONS = NODES.filter((n) => n.type === 'junction').sort(byName)

const QUICK = [
  ['Gate → SAC', 'gate', 'sac'],
  ['Gate → Food Stalls', 'gate', 'sq'],
  ['Gate → AB2 Block', 'gate', 'a3'],
  ['SAC → Food Stalls', 'sac', 'sq'],
  ['Library → Girls Hostel 3', 'lib', 'gh3'],
]

function PlaceSelect({ label, dot, value, onChange }) {
  return (
    <label className="field">
      <span className={`dot ${dot}`} aria-hidden="true" />
      <span className="field-label">{label}</span>
      <select value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Select or tap the map…</option>
        <optgroup label="Places">
          {PLACES.map((n) => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </optgroup>
        <optgroup label="Junctions">
          {JUNCTIONS.map((n) => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </optgroup>
      </select>
    </label>
  )
}

export default function Sidebar({
  fromId, toId, route, alt, noRoute, showRoads,
  onFrom, onTo, onSwap, onClear, onToggleRoads, onFocus, onQuick,
}) {
  const hasAny = fromId || toId
  const stops = route ? route.stops.filter((s) => s.node.type !== 'hidden') : []

  return (
    <aside className="panel">
      <header className="brand">
        <div className="brand-mark">R</div>
        <div>
          <h1>RGUKT Nuzvid</h1>
          <p>Campus route finder</p>
        </div>
      </header>

      <div className="pickers">
        <div className="fields">
          <PlaceSelect label="From" dot="from" value={fromId} onChange={onFrom} />
          <PlaceSelect label="To" dot="to" value={toId} onChange={onTo} />
        </div>
        <button className="icon-btn" onClick={onSwap} disabled={!hasAny} aria-label="Swap start and destination" title="Swap">
          ⇅
        </button>
      </div>

      {!hasAny && (
        <p className="hint-box">
          Tap any <b>dot</b> on the map to set your start, then tap another for your destination — or use the lists above.
        </p>
      )}
      {fromId && !toId && <p className="hint-box">Start set. Now tap the destination dot on the map.</p>}
      {noRoute && <p className="hint-box warn">No road connects these two places yet.</p>}

      {alt && (
        <p className="alt-note">
          <svg width="34" height="8" aria-hidden="true"><line x1="3" y1="4" x2="31" y2="4" /></svg>
          <span>Alternative route via <b>{alt.via.name}</b> (dotted)</span>
        </p>
      )}

      {route && (
        <ol className="steps">
          {stops.map((s, i) => (
            <li key={s.id} className={i === 0 ? 'first' : i === stops.length - 1 ? 'last' : ''}>
              <button onClick={() => onFocus(s.id)}>
                <span className="step-name">{s.node.name}</span>
                {i > 0 && <span className="step-dist">{s.meters} m</span>}
              </button>
            </li>
          ))}
        </ol>
      )}

      {!route && (
        <div className="quick">
          <h2>Popular routes</h2>
          <div className="chips">
            {QUICK.map(([label, a, b]) => (
              <button key={label} onClick={() => onQuick(a, b)}>{label}</button>
            ))}
          </div>
        </div>
      )}

      <footer className="panel-foot">
        <button className="link-btn" onClick={onClear} disabled={!hasAny}>Clear route</button>
        <label className="toggle">
          <input type="checkbox" checked={showRoads} onChange={onToggleRoads} />
          <span>Show road network</span>
        </label>
      </footer>
    </aside>
  )
}
