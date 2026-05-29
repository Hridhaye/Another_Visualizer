import { Position } from 'reactflow'

import { computeFloatingAnchors, polylineHitsObstacle } from './floatingEdge'
import type { Point, Rect } from './routeOrthogonal'

/**
 * Trunk-bundling for connectors leaving a common card.
 *
 * Routing each edge in isolation makes lines that share a source peel apart
 * immediately: they all start at the same side-midpoint and then each take a
 * slightly different independent route, so they never visually "travel together".
 * Standard flow-charts instead run lines from one node along a shared spine (a
 * trunk) for as long as possible, then branch toward each target near the end.
 *
 * This module reproduces that look deterministically: for each source card we
 * group its outgoing edges by exit side, fan their exit points evenly along that
 * side, run them out to a shared trunk coordinate, travel the trunk together,
 * then branch off toward each target.
 *
 * Reliability around cards comes from two cheap steps (no whole-edge defection):
 *   1. The trunk lane is pushed outward past any card it would otherwise run
 *      through, so the shared spine itself is always clear.
 *   2. Only the *tail* (branch-point -> target) of a line that would still cross
 *      a card is re-routed via the injected `routeTail` (A*); the shared exit +
 *      trunk + branch portion stays bundled, so the line never leaves the spine.
 */

export interface EdgeEndpoints {
  edgeId: string
  source: string
  target: string
}

/**
 * Obstacle-aware router for a single tail segment, injected by the caller to
 * avoid a circular dependency on routeOrthogonal. Returns waypoints from `from`
 * to the target anchor that avoid `obstacles`.
 */
export type RouteTail = (args: {
  from: Point
  fromPosition: Position
  target: Point
  targetPosition: Position
  obstacles: Rect[]
}) => Point[]

/** How far past the card edge the shared trunk sits, in flow units. */
const TRUNK_GAP = 48
/** Step used when pushing the trunk lane outward to clear a card, in flow units. */
const LANE_STEP = 24
/** Safety cap on how far the trunk lane may be pushed outward. */
const MAX_LANE_PUSH = 2000

function isHorizontalSide(side: Position): boolean {
  return side === Position.Left || side === Position.Right
}

function outwardSign(side: Position): number {
  return side === Position.Right || side === Position.Bottom ? 1 : -1
}


interface SideGroupEdge {
  edgeId: string
  target: string
  targetRect: Rect
  targetCenter: number
  anchorTarget: Point
  targetPosition: Position
}

/**
 * Builds bundled polylines for one source card. Edges are grouped by exit side;
 * within each side the exits are fanned and run to a shared trunk, then branch.
 * Returns a map of edgeId -> waypoint polyline (flow coords). Singletons and
 * sides with one edge get a plain elbow (no trunk).
 */
function bundleForSource(
  sourceRect: Rect,
  sourceId: string,
  edges: EdgeEndpoints[],
  rects: Map<string, Rect>,
  routeTail: RouteTail,
): Record<string, Point[]> {
  // Group this source's edges by the side they exit from.
  const bySide = new Map<Position, SideGroupEdge[]>()
  for (const edge of edges) {
    const targetRect = rects.get(edge.target)
    if (!targetRect) continue
    const anchors = computeFloatingAnchors(sourceRect, targetRect)
    const list = bySide.get(anchors.sourcePosition) ?? []
    const horizontal = isHorizontalSide(anchors.sourcePosition)
    list.push({
      edgeId: edge.edgeId,
      target: edge.target,
      targetRect,
      // Order along the trunk by the target's coordinate on the side's free axis.
      targetCenter: horizontal
        ? targetRect.y + targetRect.height / 2
        : targetRect.x + targetRect.width / 2,
      anchorTarget: anchors.target,
      targetPosition: anchors.targetPosition,
    })
    bySide.set(anchors.sourcePosition, list)
  }

  const out: Record<string, Point[]> = {}

  for (const [side, group] of bySide) {
    const horizontal = isHorizontalSide(side)
    const sign = outwardSign(side)

    // The fixed coordinate of this side (x for L/R, y for T/B).
    const sideFixed = horizontal
      ? side === Position.Right
        ? sourceRect.x + sourceRect.width
        : sourceRect.x
      : side === Position.Bottom
        ? sourceRect.y + sourceRect.height
        : sourceRect.y
    const sideMid = horizontal
      ? sourceRect.y + sourceRect.height / 2
      : sourceRect.x + sourceRect.width / 2

    // Order edges along the free axis by their target, so branch-offs keep the
    // same order and lines don't cross inside the bundle.
    group.sort((a, b) => a.targetCenter - b.targetCenter)

    // The trunk spans from the first to the last branch coordinate along the free
    // axis. Cards that are neither the source nor any target on this side are
    // obstacles the trunk must not cross.
    const groupTargetIds = new Set(group.map((e) => e.target))
    const trunkObstacles: Rect[] = []
    rects.forEach((rect, nodeId) => {
      if (nodeId === sourceId || groupTargetIds.has(nodeId)) return
      trunkObstacles.push(rect)
    })

    const branchFrees = group.map((e) => e.targetCenter)
    const trunkSpanMin = Math.min(...branchFrees, sideMid)
    const trunkSpanMax = Math.max(...branchFrees, sideMid)

    // Push the trunk lane outward until the shared spine clears every obstacle.
    let trunkFixed = sideFixed + sign * TRUNK_GAP
    for (let pushed = 0; pushed <= MAX_LANE_PUSH; pushed += LANE_STEP) {
      const candidate = sideFixed + sign * (TRUNK_GAP + pushed)
      const spine: Point[] = horizontal
        ? [
            { x: candidate, y: trunkSpanMin },
            { x: candidate, y: trunkSpanMax },
          ]
        : [
            { x: trunkSpanMin, y: candidate },
            { x: trunkSpanMax, y: candidate },
          ]
      if (!polylineHitsObstacle(spine, trunkObstacles)) {
        trunkFixed = candidate
        break
      }
    }

    // All lines leave from the single side midpoint and meet the trunk at one
    // shared entry point — no individual fanned exits.
    const exit: Point = horizontal
      ? { x: sideFixed, y: sideMid }
      : { x: sideMid, y: sideFixed }
    const trunkEntry: Point = horizontal
      ? { x: trunkFixed, y: sideMid }
      : { x: sideMid, y: trunkFixed }

    group.forEach((edge) => {

      if (group.length === 1) {
        // No bundling needed; emit a plain elbow to the target anchor.
        out[edge.edgeId] = elbow(exit, edge.anchorTarget, horizontal)
        return
      }

      // Branch point: leave the trunk at the target's free-axis coordinate.
      const branchFree = edge.targetCenter
      const branch: Point = horizontal
        ? { x: trunkFixed, y: branchFree }
        : { x: branchFree, y: trunkFixed }

      // Tail: branch -> target anchor. Try the plain straight-in first; if it
      // crosses any card, re-route just this tail (the shared exit/trunk/branch
      // stay bundled, so the line never leaves the spine).
      const tailObstacles: Rect[] = []
      rects.forEach((rect, nodeId) => {
        if (nodeId === sourceId || nodeId === edge.target) return
        tailObstacles.push(rect)
      })
      // The branch leaves the trunk heading outward along the fixed axis.
      const branchPosition: Position = horizontal
        ? sign > 0
          ? Position.Right
          : Position.Left
        : sign > 0
          ? Position.Bottom
          : Position.Top

      let tail: Point[] = [branch, edge.anchorTarget]
      if (polylineHitsObstacle([branch, edge.anchorTarget], tailObstacles)) {
        tail = routeTail({
          from: branch,
          fromPosition: branchPosition,
          target: edge.anchorTarget,
          targetPosition: edge.targetPosition,
          obstacles: tailObstacles,
        })
      }

      // source side -> shared exit -> shared trunk entry -> along trunk to branch -> tail.
      const points: Point[] = [exit, trunkEntry, ...tail]
      out[edge.edgeId] = dedupe(points)
    })
  }

  return out
}

/** A two-corner elbow between two points, bending first along the source axis. */
function elbow(a: Point, b: Point, horizontal: boolean): Point[] {
  if (horizontal) {
    const midX = (a.x + b.x) / 2
    return dedupe([a, { x: midX, y: a.y }, { x: midX, y: b.y }, b])
  }
  const midY = (a.y + b.y) / 2
  return dedupe([a, { x: a.x, y: midY }, { x: b.x, y: midY }, b])
}

function dedupe(points: Point[]): Point[] {
  const out: Point[] = []
  for (const p of points) {
    const last = out[out.length - 1]
    if (last && last.x === p.x && last.y === p.y) continue
    out.push(p)
  }
  return out
}

/**
 * Bundles every edge by source card. Returns edgeId -> polyline for all edges
 * whose endpoints are known. Polylines start at the (fanned) source exit and end
 * at the target anchor; the caller prepends the on-card source anchor as needed
 * and runs orthogonalize/simplify.
 */
export function bundleEdgesBySource(
  edges: EdgeEndpoints[],
  rects: Map<string, Rect>,
  routeTail: RouteTail,
): Record<string, Point[]> {
  const bySource = new Map<string, EdgeEndpoints[]>()
  for (const edge of edges) {
    if (!rects.has(edge.source) || !rects.has(edge.target)) continue
    const list = bySource.get(edge.source) ?? []
    list.push(edge)
    bySource.set(edge.source, list)
  }

  const result: Record<string, Point[]> = {}
  for (const [sourceId, group] of bySource) {
    const sourceRect = rects.get(sourceId)!
    Object.assign(result, bundleForSource(sourceRect, sourceId, group, rects, routeTail))
  }
  return result
}
