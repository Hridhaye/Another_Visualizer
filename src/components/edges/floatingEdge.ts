import { Position } from 'reactflow'

import type { Point, Rect } from './routeOrthogonal'

export interface FloatingAnchors {
  source: Point
  target: Point
  sourcePosition: Position
  targetPosition: Position
}

/**
 * Grows a rect about its center by `scale` (1 = unchanged), matching a centered
 * CSS transform. A highlighted card is scaled visually with `transform: scale`,
 * which does NOT change the layout box ReactFlow measures; inflating the rect by
 * the same factor keeps connectors meeting the card's visible (grown) edge
 * instead of ending under it.
 */
export function inflateRect(rect: Rect | null, scale: number): Rect | null {
  if (!rect || scale === 1) return rect
  const dw = rect.width * (scale - 1)
  const dh = rect.height * (scale - 1)
  return {
    x: rect.x - dw / 2,
    y: rect.y - dh / 2,
    width: rect.width + dw,
    height: rect.height + dh,
  }
}

/**
 * Picks the side of a card a line should attach to, based on which direction the
 * other card lies. We compare the centre-to-centre delta and attach to the side
 * facing the larger axis, so a line always exits/enters the face pointing toward
 * its partner instead of always using the fixed left/right handles.
 */
function sideFacing(from: Rect, toward: Rect): Position {
  const fromCx = from.x + from.width / 2
  const fromCy = from.y + from.height / 2
  const towardCx = toward.x + toward.width / 2
  const towardCy = toward.y + toward.height / 2

  const dx = towardCx - fromCx
  const dy = towardCy - fromCy

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? Position.Right : Position.Left
  }
  return dy >= 0 ? Position.Bottom : Position.Top
}

/** The midpoint of the given side of a rect. */
function anchorOnSide(rect: Rect, side: Position): Point {
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  switch (side) {
    case Position.Left:
      return { x: rect.x, y: cy }
    case Position.Right:
      return { x: rect.x + rect.width, y: cy }
    case Position.Top:
      return { x: cx, y: rect.y }
    case Position.Bottom:
    default:
      return { x: cx, y: rect.y + rect.height }
  }
}

/**
 * Computes where a connector should begin and end on two cards, choosing the
 * facing sides so the line emanates naturally rather than always looping out of
 * a fixed handle.
 */
export function computeFloatingAnchors(sourceRect: Rect, targetRect: Rect): FloatingAnchors {
  const sourcePosition = sideFacing(sourceRect, targetRect)
  const targetPosition = sideFacing(targetRect, sourceRect)
  return {
    source: anchorOnSide(sourceRect, sourcePosition),
    target: anchorOnSide(targetRect, targetPosition),
    sourcePosition,
    targetPosition,
  }
}

/**
 * Builds a simple orthogonal "floating elbow" between two anchors. This is the
 * cheap default shape shown live (including while dragging); A* avoidance only
 * replaces it on demand. The elbow's bend axis follows the source side so the
 * stub leaves the card cleanly.
 */
export function buildFloatingElbow(anchors: FloatingAnchors): Point[] {
  const { source, target, sourcePosition } = anchors
  const horizontal = sourcePosition === Position.Left || sourcePosition === Position.Right
  if (horizontal) {
    const midX = (source.x + target.x) / 2
    return [source, { x: midX, y: source.y }, { x: midX, y: target.y }, target]
  }
  const midY = (source.y + target.y) / 2
  return [source, { x: source.x, y: midY }, { x: target.x, y: midY }, target]
}

/** True if the axis-aligned segment a→b passes through the interior of rect. */
function segmentHitsRect(a: Point, b: Point, rect: Rect): boolean {
  const left = rect.x
  const right = rect.x + rect.width
  const top = rect.y
  const bottom = rect.y + rect.height

  if (a.y === b.y) {
    // Horizontal segment.
    if (a.y <= top || a.y >= bottom) return false
    const segMin = Math.min(a.x, b.x)
    const segMax = Math.max(a.x, b.x)
    return segMax > left && segMin < right
  }
  if (a.x === b.x) {
    // Vertical segment.
    if (a.x <= left || a.x >= right) return false
    const segMin = Math.min(a.y, b.y)
    const segMax = Math.max(a.y, b.y)
    return segMax > top && segMin < bottom
  }
  return false
}

/** True if any segment of the polyline crosses the interior of any obstacle. */
export function polylineHitsObstacle(points: Point[], obstacles: Rect[]): boolean {
  for (let i = 0; i < points.length - 1; i += 1) {
    for (const rect of obstacles) {
      if (segmentHitsRect(points[i], points[i + 1], rect)) return true
    }
  }
  return false
}
