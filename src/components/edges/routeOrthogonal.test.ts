import { describe, expect, it } from 'vitest'
import { Position } from 'reactflow'

import { routeOrthogonal, pointsToPath, type Rect } from './routeOrthogonal'

function segmentsCrossRect(points: { x: number; y: number }[], rect: Rect): boolean {
  // Sample each segment densely and check whether any sample lands strictly
  // inside the rect (small inset so touching the border doesn't count).
  const inset = 1
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]
    const b = points[i + 1]
    const steps = 60
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps
      const x = a.x + (b.x - a.x) * t
      const y = a.y + (b.y - a.y) * t
      if (
        x > rect.x + inset &&
        x < rect.x + rect.width - inset &&
        y > rect.y + inset &&
        y < rect.y + rect.height - inset
      ) {
        return true
      }
    }
  }
  return false
}

describe('routeOrthogonal', () => {
  it('produces a straight elbow when there are no obstacles', () => {
    const points = routeOrthogonal({
      source: { x: 0, y: 0 },
      target: { x: 200, y: 0 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      obstacles: [],
    })
    expect(points[0]).toEqual({ x: 0, y: 0 })
    expect(points[points.length - 1]).toEqual({ x: 200, y: 0 })
  })

  it('routes around a card sitting directly between source and target', () => {
    const blocker: Rect = { x: 80, y: -40, width: 60, height: 80 }
    const points = routeOrthogonal({
      source: { x: 0, y: 0 },
      target: { x: 220, y: 0 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      obstacles: [blocker],
      grid: 10,
      padding: 10,
    })
    expect(points[0]).toEqual({ x: 0, y: 0 })
    expect(points[points.length - 1]).toEqual({ x: 220, y: 0 })
    expect(segmentsCrossRect(points, blocker)).toBe(false)
  })

  it('emits only horizontal/vertical segments', () => {
    const points = routeOrthogonal({
      source: { x: 0, y: 0 },
      target: { x: 200, y: 120 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      obstacles: [{ x: 70, y: 20, width: 60, height: 60 }],
      grid: 10,
      padding: 10,
    })
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i]
      const b = points[i + 1]
      const orthogonal = a.x === b.x || a.y === b.y
      expect(orthogonal).toBe(true)
    }
  })

  it('approaches both cards perpendicular to the attached side (no hugging)', () => {
    // Target to the lower-right; entered from its Left side -> last segment must
    // be horizontal. Source exits Right -> first segment must be horizontal.
    const blocker: Rect = { x: 120, y: -20, width: 50, height: 200 }
    const points = routeOrthogonal({
      source: { x: 0, y: 0 },
      target: { x: 300, y: 150 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      obstacles: [blocker],
      grid: 10,
      padding: 10,
    })
    const first = points[0]
    const second = points[1]
    const lastA = points[points.length - 2]
    const lastB = points[points.length - 1]
    // First segment horizontal (perpendicular to Right side).
    expect(first.y === second.y && first.x !== second.x).toBe(true)
    // Last segment horizontal (perpendicular to Left side).
    expect(lastA.y === lastB.y && lastA.x !== lastB.x).toBe(true)
    // All segments orthogonal.
    for (let i = 0; i < points.length - 1; i += 1) {
      expect(points[i].x === points[i + 1].x || points[i].y === points[i + 1].y).toBe(true)
    }
  })

  it('extends straight out of the source before any turn', () => {
    const points = routeOrthogonal({
      source: { x: 0, y: 0 },
      target: { x: 300, y: 200 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      obstacles: [{ x: 120, y: -30, width: 50, height: 260 }],
      grid: 10,
      padding: 10,
    })
    // First segment leaves the Right side -> horizontal, moving right (+x).
    expect(points[0].y).toBe(points[1].y)
    expect(points[1].x).toBeGreaterThan(points[0].x)
  })

  it('enters the target along the normal without doubling back into the card', () => {
    // Mirrors the glitch case: obstacle between cards, target entered from Left.
    const target = { x: 300, y: 200 }
    const targetRect: Rect = { x: 300, y: 170, width: 120, height: 70 }
    const points = routeOrthogonal({
      source: { x: 0, y: 0 },
      target,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      obstacles: [{ x: 120, y: -30, width: 50, height: 300 }],
      grid: 10,
      padding: 10,
    })
    const n = points.length
    const beforeLast = points[n - 2]
    const last = points[n - 1]
    // Last segment is horizontal (perpendicular to Left side)...
    expect(beforeLast.y).toBe(last.y)
    // ...and approaches from the left (moving +x into the card), never from the
    // right side (which would mean it passed the card and doubled back).
    expect(beforeLast.x).toBeLessThan(last.x)
    // No segment cuts through the target card body.
    expect(segmentsCrossRect(points, targetRect)).toBe(false)
  })

  it('builds an SVG path string from points', () => {
    const path = pointsToPath([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 20 },
    ])
    expect(path).toBe('M 0,0 L 10,0 L 10,20')
  })
})
