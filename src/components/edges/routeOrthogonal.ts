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

function pointInRect(x: number, y: number, rect: Rect): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
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

  // Bounding region: span of source, target and all obstacles, with margin.
  const xs = [params.source.x, params.target.x, sStub.x, tStub.x]
  const ys = [params.source.y, params.target.y, sStub.y, tStub.y]
  obstacles.forEach((r) => {
    xs.push(r.x, r.x + r.width)
    ys.push(r.y, r.y + r.height)
  })
  const margin = grid * 4
  const minX = Math.min(...xs) - margin
  const minY = Math.min(...ys) - margin
  const maxX = Math.max(...xs) + margin
  const maxY = Math.max(...ys) + margin

  const cols = Math.max(1, Math.ceil((maxX - minX) / grid))
  const rows = Math.max(1, Math.ceil((maxY - minY) / grid))

  const toCell = (p: Point): Cell => ({
    col: Math.min(cols - 1, Math.max(0, Math.round((p.x - minX) / grid))),
    row: Math.min(rows - 1, Math.max(0, Math.round((p.y - minY) / grid))),
  })
  const toPoint = (c: Cell): Point => ({ x: minX + c.col * grid, y: minY + c.row * grid })

  const blocked = (col: number, row: number): boolean => {
    const x = minX + col * grid
    const y = minY + row * grid
    return obstacles.some((r) => pointInRect(x, y, r))
  }

  // Route between the stub points, not the on-card anchors.
  const start = toCell(sStub)
  const goal = toCell(tStub)
  // Bias the first/last steps to leave/enter along the handle's facing direction.
  const startDir = directionOffset(params.sourcePosition)
  const goalDir = directionOffset(params.targetPosition)

  const key = (col: number, row: number, dir: number) => `${col},${row},${dir}`
  // dir: 0 = none (start), 1 = horizontal, 2 = vertical
  const dirOf = (dx: number) => (dx !== 0 ? 1 : 2)

  interface NodeState {
    col: number
    row: number
    dir: number
    g: number
    f: number
    parent: NodeState | null
  }

  const startState: NodeState = {
    col: start.col,
    row: start.row,
    dir: 0,
    g: 0,
    f: 0,
    parent: null,
  }

  const open: NodeState[] = [startState]
  const seen = new Map<string, number>()
  seen.set(key(start.col, start.row, 0), 0)

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

  while (open.length > 0 && iterations < maxIterations) {
    iterations += 1
    // Pop lowest f (linear scan is fine for our grid sizes).
    let bestIdx = 0
    for (let i = 1; i < open.length; i += 1) {
      if (open[i].f < open[bestIdx].f) bestIdx = i
    }
    const current = open.splice(bestIdx, 1)[0]

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
      if (!isEndpoint && blocked(nc, nr)) continue

      const moveDir = dirOf(move.dx)
      const turned = current.dir !== 0 && current.dir !== moveDir
      const stepCost = 1 + (turned ? TURN_PENALTY : 0)
      const g = current.g + stepCost
      const k = key(nc, nr, moveDir)
      const prev = seen.get(k)
      if (prev !== undefined && prev <= g) continue
      seen.set(k, g)
      open.push({
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
