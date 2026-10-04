import { useEffect, useState } from 'react'
import { distanceToCampusKm, isOnCampus, latLngToPixel } from './geo.js'

/**
 * Watches the device position while `active` is true.
 *
 * status: 'idle' | 'locating' | 'ok' | 'outside' | 'denied' | 'unavailable'
 * fix:    { x, y, accuracy, lat, lng } in map pixels once we have a position on campus
 *
 * For testing without GPS, open the app with ?fakeLoc=<lat>,<lng> to use that position.
 */
export default function useLiveLocation(active) {
  const [state, setState] = useState({ status: 'idle', fix: null, km: null })

  useEffect(() => {
    if (!active) {
      setState({ status: 'idle', fix: null, km: null })
      return undefined
    }

    const onPosition = (lat, lng, accuracy) => {
      const { x, y } = latLngToPixel(lat, lng)
      if (isOnCampus(x, y)) {
        setState((prev) => {
          // ignore GPS jitter of a pixel or two so the route doesn't redraw constantly
          if (prev.fix && Math.hypot(prev.fix.x - x, prev.fix.y - y) < 2) return prev
          return { status: 'ok', fix: { x, y, accuracy, lat, lng }, km: 0 }
        })
      } else {
        setState({ status: 'outside', fix: null, km: distanceToCampusKm(lat, lng) })
      }
    }

    setState((prev) => (prev.status === 'ok' ? prev : { status: 'locating', fix: null, km: null }))

    const fake = new URLSearchParams(window.location.search).get('fakeLoc')
    if (fake) {
      const [lat, lng] = fake.split(',').map(Number)
      onPosition(lat, lng, 8)
      return undefined
    }

    if (!('geolocation' in navigator)) {
      setState({ status: 'unavailable', fix: null, km: null })
      return undefined
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => onPosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
      (err) => setState({ status: err.code === 1 ? 'denied' : 'unavailable', fix: null, km: null }),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [active])

  return state
}
