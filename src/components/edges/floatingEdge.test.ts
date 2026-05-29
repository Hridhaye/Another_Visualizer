import { describe, expect, it } from 'vitest'
import { Position } from 'reactflow'

import { computeFloatingAnchors, buildFloatingElbow, polylineHitsObstacle } from './floatingEdge'
import type { Rect } from './routeOrthogonal'

const A: Rect = { x: 0, y: 0, width: 100, height: 60 }

describe('computeFloatingAnchors', () => {
  it('exits right / enters left when target is to the right', () => {
    const target: Rect = { x: 300, y: 0, width: 100, height: 60 }
    const anchors = computeFloatingAnchors(A, target)
    expect(anchors.sourcePosition).toBe(Position.Right)
    expect(anchors.targetPosition).toBe(Position.Left)
    expect(anchors.source).toEqual({ x: 100, y: 30 })
    expect(anchors.target).toEqual({ x: 300, y: 30 })
  })

  it('exits left / enters right when target is to the left', () => {
    const target: Rect = { x: -300, y: 0, width: 100, height: 60 }
    const anchors = computeFloatingAnchors(A, target)
    expect(anchors.sourcePosition).toBe(Position.Left)
    expect(anchors.targetPosition).toBe(Position.Right)
  })

  it('uses top/bottom when the target is mostly above or below', () => {
    const below: Rect = { x: 0, y: 300, width: 100, height: 60 }
    const anchors = computeFloatingAnchors(A, below)
    expect(anchors.sourcePosition).toBe(Position.Bottom)
    expect(anchors.targetPosition).toBe(Position.Top)
  })
})

describe('buildFloatingElbow', () => {
  it('produces an orthogonal 4-point elbow for horizontal exits', () => {
    const anchors = computeFloatingAnchors(A, { x: 300, y: 120, width: 100, height: 60 })
    const points = buildFloatingElbow(anchors)
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i]
      const b = points[i + 1]
      expect(a.x === b.x || a.y === b.y).toBe(true)
    }
    expect(points[0]).toEqual(anchors.source)
    expect(points[points.length - 1]).toEqual(anchors.target)
  })
})

describe('polylineHitsObstacle', () => {
  const line = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ]

  it('detects a rect the polyline passes through', () => {
    const blocker: Rect = { x: 90, y: 40, width: 40, height: 40 }
    expect(polylineHitsObstacle(line, [blocker])).toBe(true)
  })

  it('ignores a rect well away from the polyline', () => {
    const far: Rect = { x: 300, y: 300, width: 40, height: 40 }
    expect(polylineHitsObstacle(line, [far])).toBe(false)
  })

  it('does not count a rect the segment only runs alongside', () => {
    // Horizontal segment at y=0; rect sits below starting at y=10, not crossed.
    const beside: Rect = { x: 20, y: 10, width: 40, height: 40 }
    expect(polylineHitsObstacle([{ x: 0, y: 0 }, { x: 100, y: 0 }], [beside])).toBe(false)
  })
})
