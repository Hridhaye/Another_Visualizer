import { describe, expect, it } from 'vitest'

import { bundleEdgesBySource, type EdgeEndpoints, type RouteTail } from './bundleEdges'
import type { Rect } from './routeOrthogonal'

const CARD = { width: 160, height: 70 }

function card(x: number, y: number): Rect {
  return { x, y, width: CARD.width, height: CARD.height }
}

// Straight-in stub: records calls so tests can assert when a tail was re-routed.
function makeRouteTail() {
  const calls: { from: { x: number; y: number } }[] = []
  const routeTail: RouteTail = ({ from, target }) => {
    calls.push({ from })
    return [from, target]
  }
  return { routeTail, calls }
}

describe('bundleEdgesBySource', () => {
  it('routes a single edge as a plain elbow (no trunk artifacts)', () => {
    const rects = new Map<string, Rect>([
      ['a', card(0, 0)],
      ['b', card(400, 0)],
    ])
    const edges: EdgeEndpoints[] = [{ edgeId: 'e1', source: 'a', target: 'b' }]
    const result = bundleEdgesBySource(edges, rects, makeRouteTail().routeTail)
    expect(result.e1).toBeDefined()
    expect(result.e1.length).toBeGreaterThanOrEqual(2)
  })

  it('avoids a card on a single (un-bundled) line via the tail router', () => {
    const { routeTail, calls } = makeRouteTail()
    // One line from 'a' to 'b'; a card sits directly between them.
    const rects = new Map<string, Rect>([
      ['a', card(0, 200)],
      ['b', card(600, 200)],
      ['blocker', { x: 250, y: 180, width: 200, height: 120 }],
    ])
    const edges: EdgeEndpoints[] = [{ edgeId: 'e1', source: 'a', target: 'b' }]
    const result = bundleEdgesBySource(edges, rects, routeTail)
    // The blocked single line was handed to routeTail for avoidance.
    expect(calls.length).toBe(1)
    expect(result.e1).toBeDefined()
  })

  it('leaves a clear single line untouched (no needless re-route)', () => {
    const { routeTail, calls } = makeRouteTail()
    const rects = new Map<string, Rect>([
      ['a', card(0, 0)],
      ['b', card(400, 0)],
    ])
    const edges: EdgeEndpoints[] = [{ edgeId: 'e1', source: 'a', target: 'b' }]
    bundleEdgesBySource(edges, rects, routeTail)
    expect(calls.length).toBe(0)
  })

  it('makes same-source edges share a trunk x before branching', () => {
    // Three targets all to the right of A but at different heights.
    const rects = new Map<string, Rect>([
      ['a', card(0, 200)],
      ['b', card(500, 0)],
      ['c', card(500, 200)],
      ['d', card(500, 400)],
    ])
    const edges: EdgeEndpoints[] = [
      { edgeId: 'e1', source: 'a', target: 'b' },
      { edgeId: 'e2', source: 'a', target: 'c' },
      { edgeId: 'e3', source: 'a', target: 'd' },
    ]
    const result = bundleEdgesBySource(edges, rects, makeRouteTail().routeTail)

    // Every bundled line must touch a common trunk x: the lines run out to the
    // same vertical spine and travel along it before branching. (For the edge
    // aligned with the source, onTrunk and branch coincide and one is deduped, so
    // assert on "contains the trunk x" rather than a fixed index.)
    const trunkX = result.e1[1].x
    for (const line of [result.e1, result.e2, result.e3]) {
      expect(line.some((p) => p.x === trunkX)).toBe(true)
    }
    // The trunk x sits outside the source card (exits are fanned along its right
    // edge at x=160, trunk is further right).
    expect(trunkX).toBeGreaterThan(160)
  })

  it('all same-source lines share a single exit point on the card edge', () => {
    const rects = new Map<string, Rect>([
      ['a', card(0, 200)],
      ['b', card(500, 0)],
      ['c', card(500, 400)],
    ])
    const edges: EdgeEndpoints[] = [
      { edgeId: 'e1', source: 'a', target: 'b' },
      { edgeId: 'e2', source: 'a', target: 'c' },
    ]
    const result = bundleEdgesBySource(edges, rects, makeRouteTail().routeTail)
    // Both lines start at the same point: the side midpoint of card 'a'.
    expect(result.e1[0].x).toBe(result.e2[0].x)
    expect(result.e1[0].y).toBe(result.e2[0].y)
    // That point is the right edge of 'a' (x=160), at mid-height (200 + 35 = 235).
    expect(result.e1[0].x).toBe(160)
    expect(result.e1[0].y).toBe(235)
  })

  it('separates edges that exit on different sides into independent groups', () => {
    const rects = new Map<string, Rect>([
      ['a', card(200, 200)],
      ['right', card(600, 200)],
      ['left', card(-400, 200)],
    ])
    const edges: EdgeEndpoints[] = [
      { edgeId: 'e1', source: 'a', target: 'right' },
      { edgeId: 'e2', source: 'a', target: 'left' },
    ]
    const result = bundleEdgesBySource(edges, rects, makeRouteTail().routeTail)
    // Each side has one edge -> plain elbows. The right-going line exits the
    // right edge (x = 360), the left-going line exits the left edge (x = 200).
    expect(result.e1[0].x).toBe(360)
    expect(result.e2[0].x).toBe(200)
  })

  it('pushes the trunk lane past a card blocking the spine', () => {
    // A source with two right-side targets; a blocker sits in the default trunk
    // lane just right of the source, spanning between the two branch heights.
    const rects = new Map<string, Rect>([
      ['a', card(0, 200)],
      ['top', card(800, 0)],
      ['bottom', card(800, 400)],
      // Default trunk would be ~x=160+48=208; place a card straddling that x and
      // the vertical span between the two branches.
      ['blocker', { x: 190, y: 120, width: 80, height: 300 }],
    ])
    const edges: EdgeEndpoints[] = [
      { edgeId: 'e1', source: 'a', target: 'top' },
      { edgeId: 'e2', source: 'a', target: 'bottom' },
    ]
    const result = bundleEdgesBySource(edges, rects, makeRouteTail().routeTail)
    // The shared trunk x must clear the blocker (x in [190, 270]).
    const trunkX = result.e1[1].x
    expect(trunkX).toBeGreaterThan(270)
    // Both lines still share that trunk x — the bundle held together.
    expect(result.e2.some((p) => p.x === trunkX)).toBe(true)
  })

  it('re-routes only the tail when a card blocks the straight branch-in', () => {
    const { routeTail, calls } = makeRouteTail()
    // Target is to the right; a card sits directly between the trunk branch point
    // and the target anchor, blocking the straight tail.
    const rects = new Map<string, Rect>([
      ['a', card(0, 200)],
      ['near', card(400, 0)],
      ['far', card(900, 200)],
      ['blocker', { x: 500, y: 180, width: 200, height: 100 }],
    ])
    const edges: EdgeEndpoints[] = [
      { edgeId: 'e1', source: 'a', target: 'near' },
      { edgeId: 'e2', source: 'a', target: 'far' },
    ]
    const result = bundleEdgesBySource(edges, rects, routeTail)
    // The blocked tail (to 'far') was handed to routeTail; the clear one was not.
    expect(calls.length).toBe(1)
    // Both lines still begin on the shared trunk (bundle preserved).
    const trunkX = result.e1[1].x
    expect(result.e2.some((p) => p.x === trunkX)).toBe(true)
  })
})
