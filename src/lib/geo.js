import { MAP_SIZE } from '../data/campus.js'

// GPS <-> map-pixel conversion for public/campus-map.jpg.
//
// The satellite image is aligned to real coordinates with a similarity transform
// (scale + small rotation + shift). It was fitted by overlaying the campus roads from
// OpenStreetMap on the image: the roads line up with the real ones to within ~10 px (~6 m).
// To re-calibrate, stand at two or three known spots, note their lat/lng and pixel position,
// and refit the four numbers below.
const ORIGIN = { lat: 16.7927, lng: 80.8246 }
const PX_PER_M = 1.5483
const ROTATION = 0.0142 // radians
const OFFSET = { x: 895.164, y: 592.666 } // pixel position of ORIGIN

const M_PER_DEG_LAT = 111320
const M_PER_DEG_LNG = 111320 * Math.cos((ORIGIN.lat * Math.PI) / 180)
const COS = Math.cos(ROTATION)
const SIN = Math.sin(ROTATION)

export function latLngToPixel(lat, lng) {
  const east = (lng - ORIGIN.lng) * M_PER_DEG_LNG
  const south = -(lat - ORIGIN.lat) * M_PER_DEG_LAT
  return {
    x: OFFSET.x + PX_PER_M * (COS * east - SIN * south),
    y: OFFSET.y + PX_PER_M * (SIN * east + COS * south),
  }
}

export function pixelToLatLng(x, y) {
  const X = (x - OFFSET.x) / PX_PER_M
  const Y = (y - OFFSET.y) / PX_PER_M
  const east = COS * X + SIN * Y
  const south = -SIN * X + COS * Y
  return { lat: ORIGIN.lat - south / M_PER_DEG_LAT, lng: ORIGIN.lng + east / M_PER_DEG_LNG }
}

// "On campus" = inside the mapped area (plus a small margin for GPS error).
const MARGIN_PX = 60

export function isOnCampus(x, y) {
  return x >= -MARGIN_PX && y >= -MARGIN_PX && x <= MAP_SIZE.width + MARGIN_PX && y <= MAP_SIZE.height + MARGIN_PX
}

/** Rough distance from a GPS fix to the edge of the mapped campus, in km. */
export function distanceToCampusKm(lat, lng) {
  const { x, y } = latLngToPixel(lat, lng)
  const dx = Math.max(0, -x, x - MAP_SIZE.width)
  const dy = Math.max(0, -y, y - MAP_SIZE.height)
  return Math.hypot(dx, dy) / PX_PER_M / 1000
}
