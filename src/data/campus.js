// Campus graph. All coordinates are pixels on public/campus-map.jpg (1600 x 1107).
//
// type: 'gate' | 'building' | 'ground' | 'junction' | 'hidden'
//   - gate/building/ground/junction show up as clickable dots
//   - hidden nodes are invisible road joints that only exist to branch the road network
//
// EDGES are [from, to, via?]. `via` is a list of [x, y] points the road bends through,
// so the drawn route hugs the real road instead of cutting straight between two dots.

export const MAP_SIZE = { width: 1600, height: 1107 }

// Rough scale of the satellite image, used only for the "≈ distance / walk time" estimate.
export const METERS_PER_PIXEL = 0.6
export const WALK_METERS_PER_MIN = 75

export const NODES = [
  // ── Entrance & academic blocks ─────────────────────────────
  { id: 'gate', name: 'Main Gate (Entry)', type: 'gate', x: 499, y: 1004 },
  { id: 'a4', name: 'A4 Block', type: 'building', x: 424, y: 896 },
  { id: 'acj', name: 'Academic Junction', type: 'junction', x: 424, y: 841 },
  { id: 'a3', name: 'A3 Block', type: 'building', x: 407, y: 783 },
  { id: 'acy', name: 'Academic Courtyard', type: 'ground', x: 440, y: 733 },
  { id: 'a2', name: 'Academic Block (North)', type: 'building', x: 488, y: 673 },
  { id: 'r1', type: 'hidden', x: 500, y: 750 },
  { id: 'r2', type: 'hidden', x: 540, y: 700 },

  // ── Central spine ──────────────────────────────────────────
  { id: 'fj', name: 'Food Court Junction', type: 'junction', x: 596, y: 611 },
  { id: 'fc', name: 'Food Court', type: 'building', x: 634, y: 574 },
  { id: 'lib', name: 'Central Library', type: 'building', x: 493, y: 493 },
  { id: 'fs', name: 'Food Stalls', type: 'building', x: 652, y: 454 },
  { id: 'din', name: 'Dining Hall', type: 'building', x: 560, y: 418 },
  { id: 'pj', name: 'Pond Junction', type: 'junction', x: 744, y: 491 },
  { id: 'adm', name: 'Administration Block (I3)', type: 'building', x: 841, y: 497 },
  { id: 'hos', name: 'IIIT Hospital', type: 'building', x: 911, y: 491 },
  { id: 'yj', name: 'Yogasala Road Junction', type: 'junction', x: 994, y: 534 },

  // ── Boys hostels (north) ───────────────────────────────────
  { id: 'hj', name: 'Hostel Junction', type: 'junction', x: 711, y: 280 },
  { id: 'bh1', name: 'Boys Hostel – 1', type: 'building', x: 621, y: 248 },
  { id: 'bh2', name: 'Boys Hostel – 2', type: 'building', x: 803, y: 310 },
  { id: 'hej', name: 'Hostel East Junction', type: 'junction', x: 890, y: 343 },
  { id: 'sq', name: 'Quarters Junction', type: 'junction', x: 913, y: 283 },
  { id: 'nj', name: 'North Hostel Road', type: 'junction', x: 951, y: 174 },

  // ── Playground, girls hostels & SAC (east) ─────────────────
  { id: 'pgw', name: 'Playground (West)', type: 'ground', x: 1045, y: 306 },
  { id: 'pgn', name: 'Playground (North)', type: 'ground', x: 1167, y: 265 },
  { id: 'gj', name: 'Playground Road Junction', type: 'junction', x: 1056, y: 404 },
  { id: 'gh1', name: 'Girls Hostel – 1', type: 'building', x: 1131, y: 417 },
  { id: 'gh2', name: 'Girls Hostel – 2', type: 'building', x: 1278, y: 454 },
  { id: 'gh3', name: 'Girls Hostel – 3', type: 'building', x: 1422, y: 491 },
  { id: 'sac', name: 'SAC Auditorium', type: 'building', x: 1249, y: 348 },
  { id: 'sacg', name: 'SAC Grounds', type: 'ground', x: 1290, y: 357 },
  { id: 'er', name: 'East Road (Pond Side)', type: 'junction', x: 1515, y: 400 },

  // ── South campus ───────────────────────────────────────────
  { id: 's1', name: 'South Campus – West Gate', type: 'building', x: 880, y: 840 },
  { id: 's2', name: 'South Campus – East Gate', type: 'building', x: 1052, y: 1013 },
  { id: 's3', name: 'South Road End', type: 'junction', x: 1028, y: 1097 },
]

export const EDGES = [
  // Gate → academic blocks → central junction
  ['gate', 'a4', [[478, 972], [450, 940], [432, 912]]],
  ['a4', 'acj'],
  ['acj', 'r1', [[438, 825], [452, 800], [476, 772]]],
  ['r1', 'r2', [[518, 725]]],
  ['r2', 'fj', [[572, 652]]],
  ['acj', 'a3', [[412, 815]]],
  ['a3', 'acy'],
  ['acy', 'r1'],
  ['acy', 'a2', [[465, 700]]],
  ['a2', 'r2'],

  // Central spine
  ['fj', 'fc'],
  ['fj', 'pj', [[640, 612], [690, 590], [728, 545]]],
  ['fj', 'fs', [[625, 560], [640, 500]]],
  ['fj', 'lib', [[575, 603], [530, 585], [487, 565], [480, 525]]],
  ['fs', 'din', [[605, 436]]],
  ['fs', 'pj', [[695, 468]]],
  ['pj', 'adm', [[800, 500]]],
  ['adm', 'hos'],
  ['hos', 'yj', [[960, 510]]],

  // Boys hostels
  ['fs', 'hj', [[660, 420], [680, 360], [702, 305]]],
  ['hj', 'bh1', [[660, 262]]],
  ['hj', 'bh2', [[755, 298]]],
  ['bh2', 'hej', [[850, 330]]],
  ['adm', 'hej', [[862, 450], [878, 395]]],
  ['hej', 'sq'],
  ['sq', 'nj', [[930, 225]]],

  // East side
  ['sq', 'pgw', [[975, 296], [1005, 310]]],
  ['pgw', 'gj', [[1058, 355]]],
  ['pgw', 'pgn', [[1105, 272]]],
  ['pgn', 'sac', [[1225, 300]]],
  ['yj', 'gj', [[1030, 490], [1045, 440]]],
  ['gj', 'gh1'],
  ['gh1', 'gh2', [[1205, 433]]],
  ['gh2', 'gh3'],
  ['gh3', 'er', [[1460, 497], [1500, 500], [1507, 450]]],
  ['gh2', 'sac', [[1268, 415]]],
  ['sac', 'sacg'],

  // South campus
  ['yj', 's1', [[950, 540], [918, 560], [908, 650], [893, 760]]],
  ['s1', 's3', [[866, 940], [862, 1040], [930, 1090]]],
  ['s3', 's2'],
]
