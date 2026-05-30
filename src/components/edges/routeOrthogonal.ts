import { Position } from 'reactflow'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

export interface RouteParams {
  source: Point
  target: Point
  sourcePosition: Position
  targetPosition: Position
  /** Card rectangles to route around (flow coordinates). Source/target excluded by caller. */
  obstacles: Rect[]
  /** Grid cell size in flow units. Smaller = finer routes but slower. */
  grid?: number
  /** Padding kept around each obstacle so lines don't hug card edges. */
  padding?: number
}

interface Cell {
  col: number
  row: number
}

const DEFAULT_GRID = 16
const DEFAULT_PADDING = 18
// Penalty (in extra grid steps) added each time the path changes direction, so
// A* prefers straight runs and produces clean flow-chart elbows instead of stairs.
const TURN_PENALTY = 8

function directionOffset(position: Position): Point {
  switch (position) {
    case Position.Left:
      return { x: -1, y: 0 }
    case Position.Right:
      return { x: 1, y: 0 }
    case Position.Top:
      return { x: 0, y: -1 }
    case Position.Bottom:
    default:
      return { x: 0, y: 1 }
  }
}

function inflate(rect: Rect, by: number): Rect {
  return {
    x: rect.x - by,
    y: rect.y - by,
    width: rect.width + by * 2,
    height: rect.height + by * 2,
  }
}

/**
 * Builds the straight-elbow fallback used when no obstacle-free route is found
 * (e.g. fully boxed in). Mirrors buildElbowGeometry's centered shape.
 */
function elbowFallback(params: RouteParams): Point[] {
  const { source, target, sourcePosition } = params
  const horizontal = sourcePosition === Position.Left || sourcePosition === Position.Right
  if (horizontal) {
    const midX = (source.x + target.x) / 2
    return [source, { x: midX, y: source.y }, { x: midX, y: target.y }, target]
  }
  const midY = (source.y + target.y) / 2
  return [source, { x: source.x, y: midY }, { x: target.x, y: midY }, target]
}

/**
 * Routes an orthogonal (90°-only) path from source to target that avoids the
 * given obstacle rectangles, using A* on a coarse grid with a turn penalty.
 * Returns a simplified list of waypoints (corners only). Falls back to a plain
 * elbow if no route exists.
 */
export function routeOrthogonal(params: RouteParams): Point[] {
  const grid = params.grid ?? DEFAULT_GRID
  const padding = params.padding ?? DEFAULT_PADDING
  const obstacles = params.obstacles.map((r) => inflate(r, padding))

  // Push stub points out from each card along the side's outward normal, far
  // enough to clear the card's own padding. A* routes between these stubs (not
  // the on-card anchors), so the perpendicular stub segments are the only thing
  // touching the cards — guaranteeing a clean head-on connection with no bump.
  const stubLen = padding + grid
  const sDir = directionOffset(params.sourcePosition)
  const tDir = directionOffset(params.targetPosition)
  const sStub: Point = {
    x: params.source.x + sDir.x * stubLen,
    y: params.source.y + sDir.y * stubLen,
  }
  const tStub: Point = {
    x: params.target.x + tDir.x * stubLen,
    y: params.target.y + tDir.y * stubLen,
  }

  // Bounding region: the corridor spanned by the source/target stubs, expanded
  // with a margin so A* has room to detour around blockers. Only obstacles that
  // intersect this region matter — so an edge between two nearby cards routes on
  // a small local grid instead of one spanning the whole board (the callers pass
  // *all* cards as obstacles). This is the key scaling win.
  const margin = grid * 8
  let minX = Math.min(params.source.x, params.target.x, sStub.x, tStub.x) - margin
  let minY = Math.min(params.source.y, params.target.y, sStub.y, tStub.y) - margin
  let maxX = Math.max(params.source.x, params.target.x, sStub.x, tStub.x) + margin
  let maxY = Math.max(params.source.y, params.target.y, sStub.y, tStub.y) + margin

  // Keep only obstacles overlapping the corridor, and grow the region to fully
  // contain each so the router can always go around it (not just up to its edge).
  const localObstacles: Rect[] = []
  for (const r of obstacles) {
    if (r.x > maxX || r.x + r.width < minX || r.y > maxY || r.y + r.height < minY) continue
    localObstacles.push(r)
    minX = Math.min(minX, r.x - margin)
    minY = Math.min(minY, r.y - margin)
    maxX = Math.max(maxX, r.x + r.width + margin)
    maxY = Math.max(maxY, r.y + r.height + margin)
  }

  const cols = Math.max(1, Math.ceil((maxX - minX) / grid))
  const rows = Math.max(1, Math.ceil((maxY - minY) / grid))

  const toCell = (p: Point): Cell => ({
    col: Math.min(cols - 1, Math.max(0, Math.round((p.x - minX) / grid))),
    row: Math.min(rows - 1, Math.max(0, Math.round((p.y - minY) / grid))),
  })
  const toPoint = (c: Cell): Point => ({ x: minX + c.col * grid, y: minY + c.row * grid })

  // Rasterize obstacles into a blocked grid once (mark every cell each inflated
  // rect covers), so the A* neighbour test is an O(1) array read instead of
  // scanning every obstacle per cell.
  const blockedGrid = new Uint8Array(cols * rows)
  for (const r of localObstacles) {
    const c0 = Math.max(0, Math.floor((r.x - minX) / grid))
    const c1 = Math.min(cols - 1, Math.ceil((r.x + r.width - minX) / grid))
    const r0 = Math.max(0, Math.floor((r.y - minY) / grid))
    const r1 = Math.min(rows - 1, Math.ceil((r.y + r.height - minY) / grid))
    for (let row = r0; row <= r1; row += 1) {
      const base = row * cols
      for (let col = c0; col <= c1; col += 1) blockedGrid[base + col] = 1
    }
  }

  // Route between the stub points, not the on-card anchors.
  const start = toCell(sStub)
  const goal = toCell(tStub)
  // Bias the first/last steps to leave/enter along the handle's facing direction.
  const startDir = directionOffset(params.sourcePosition)
  const goalDir = directionOffset(params.targetPosition)

  // Visited key encodes arrival direction so a cell can be re-expanded when
  // reached along a different axis (the turn penalty depends on it).
  // dir: 0 = none (start), 1 = horizontal, 2 = vertical.
  const visitKey = (col: number, row: number, dir: number) => (row * cols + col) * 3 + dir
  const dirOf = (dx: number) => (dx !== 0 ? 1 : 2)

  interface NodeState {
    col: number
    row: number
    dir: number
    g: number
    f: number
    parent: NodeState | null
  }

  // Binary min-heap on f, so popping the best node is O(log n) instead of an
  // O(n) linear scan of the open set.
  const heap: NodeState[] = []
  const heapPush = (n: NodeState) => {
    heap.push(n)
    let i = heap.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (heap[p].f <= heap[i].f) break
      const t = heap[p]; heap[p] = heap[i]; heap[i] = t
      i = p
    }
  }
  const heapPop = (): NodeState => {
    const top = heap[0]
    const last = heap.pop() as NodeState
    if (heap.length > 0) {
      heap[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = 2 * i + 2
        let s = i
        if (l < heap.length && heap[l].f < heap[s].f) s = l
        if (r < heap.length && heap[r].f < heap[s].f) s = r
        if (s === i) break
        const t = heap[s]; heap[s] = heap[i]; heap[i] = t
        i = s
      }
    }
    return top
  }

  heapPush({ col: start.col, row: start.row, dir: 0, g: 0, f: 0, parent: null })
  const seen = new Map<number, number>()
  seen.set(visitKey(start.col, start.row, 0), 0)

  const heuristic = (col: number, row: number) =>
    Math.abs(col - goal.col) + Math.abs(row - goal.row)

  const moves = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ]

  let found: NodeState | null = null
  let iterations = 0
  const maxIterations = cols * rows * 4

  while (heap.length > 0 && iterations < maxIterations) {
    iterations += 1
    const current = heapPop()

    if (current.col === goal.col && current.row === goal.row) {
      found = current
      break
    }

    for (const move of moves) {
      // Hard constraint: the first step must leave the start stub along the
      // source side's outward normal, so the line always extends straight out of
      // the card before any turn.
      if (current.dir === 0 && (move.dx !== startDir.x || move.dy !== startDir.y)) {
        continue
      }
      const nc = current.col + move.dx
      const nr = current.row + move.dy
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue

      // Hard constraint: the goal stub may only be entered by moving *against* the
      // target side's outward normal (i.e. heading into the card). This forbids
      // the body from arriving at the stub from the wrong direction and then
      // doubling back into the card — the cause of the clunky pokes.
      if (nc === goal.col && nr === goal.row) {
        if (move.dx !== -goalDir.x || move.dy !== -goalDir.y) continue
      }

      // Allow start/goal cells even if they fall inside an inflated rect.
      const isEndpoint =
        (nc === goal.col && nr === goal.row) || (nc === start.col && nr === start.row)
      if (!isEndpoint && blockedGrid[nr * cols + nc]) continue

      const moveDir = dirOf(move.dx)
      const turned = current.dir !== 0 && current.dir !== moveDir
      const stepCost = 1 + (turned ? TURN_PENALTY : 0)
      const g = current.g + stepCost
      const k = visitKey(nc, nr, moveDir)
      const prev = seen.get(k)
      if (prev !== undefined && prev <= g) continue
      seen.set(k, g)
      heapPush({
        col: nc,
        row: nr,
        dir: moveDir,
        g,
        f: g + heuristic(nc, nr),
        parent: current,
      })
    }
  }

  if (!found) {
    return elbowFallback(params)
  }

  // Reconstruct cell path.
  const cells: Cell[] = []
  let node: NodeState | null = found
  while (node) {
    cells.push({ col: node.col, row: node.row })
    node = node.parent
  }
  cells.reverse()

  // Convert cell path to points and snap its ends to the exact stub points.
  const body: Point[] = cells.map(toPoint)
  body[0] = sStub
  body[body.length - 1] = tStub

  // The full path is: source -> sStub (perpendicular exit) -> routed body ->
  // tStub -> target (perpendicular entry). The on-card segments are exactly the
  // stub normals, so the line always connects head-on, no hugging or bump.
  const full: Point[] = [params.source, ...body, params.target]

  // Stub points sit at the anchor + normal offset (arbitrary coords) while the
  // routed body is grid-aligned, so a stub->body join can be diagonal. Insert
  // orthogonal corners wherever two consecutive points differ on both axes,
  // turning first along the incoming segment's axis to preserve the perpendicular
  // ends.
  return simplify(orthogonalize(full, params.sourcePosition))
}

/**
 * Inserts a right-angle corner between any two consecutive points that differ on
 * both axes, so the whole polyline is axis-aligned. The first corner turns along
 * the source side's normal so the initial segment stays perpendicular.
 */
export function orthogonalize(points: Point[], sourcePosition: Position): Point[] {
  if (points.length < 2) return points
  const sDir = directionOffset(sourcePosition)
  const startAxis: 'h' | 'v' = sDir.x !== 0 ? 'h' : 'v'

  const out: Point[] = [points[0]]
  let lastAxis: 'h' | 'v' | null = null
  for (let i = 1; i < points.length; i += 1) {
    const prev = out[out.length - 1]
    const cur = points[i]
    if (prev.x === cur.x && prev.y === cur.y) continue
    if (prev.x === cur.x || prev.y === cur.y) {
      out.push(cur)
      lastAxis = prev.y === cur.y ? 'h' : 'v'
      continue
    }
    // Diagonal: pick which axis to traverse first. For the very first segment use
    // the source-side axis; afterwards continue the previous axis to avoid a
    // double-turn.
    const firstAxis: 'h' | 'v' = lastAxis ?? startAxis
    const corner: Point =
      firstAxis === 'h' ? { x: cur.x, y: prev.y } : { x: prev.x, y: cur.y }
    out.push(corner)
    out.push(cur)
    lastAxis = firstAxis === 'h' ? 'v' : 'h'
  }
  return out
}

export function simplify(raw: Point[]): Point[] {
  if (raw.length <= 2) return raw
  const simplified: Point[] = [raw[0]]
  for (let i = 1; i < raw.length - 1; i += 1) {
    const prev = simplified[simplified.length - 1]
    const cur = raw[i]
    const next = raw[i + 1]
    // Drop duplicates and collinear midpoints.
    if (cur.x === prev.x && cur.y === prev.y) continue
    const collinear =
      (prev.x === cur.x && cur.x === next.x) || (prev.y === cur.y && cur.y === next.y)
    if (!collinear) simplified.push(cur)
  }
  simplified.push(raw[raw.length - 1])
  return simplified
}

/** Converts a polyline of waypoints into an SVG path string with sharp corners. */
export function pointsToPath(points: Point[]): string {
  if (points.length === 0) return ''
  const [first, ...rest] = points
  return `M ${first.x},${first.y} ` + rest.map((p) => `L ${p.x},${p.y}`).join(' ')
}
