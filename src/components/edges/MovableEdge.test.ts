import { describe, expect, it } from 'vitest'
import { Position } from 'reactflow'

import { buildElbowGeometry, resolveEdgeOffset } from './edgeOffset'

describe('resolveEdgeOffset', () => {
  it('prefers a manual offset when one is stored on the edge', () => {
    expect(resolveEdgeOffset({ manualOffset: -18, lateralShift: 12 })).toBe(-18)
  })

  it('falls back to the lane-based shift when no manual offset exists', () => {
    expect(resolveEdgeOffset({ lateralShift: 12 })).toBe(12)
  })

  it('returns 0 when no offset data is available', () => {
    expect(resolveEdgeOffset({})).toBe(0)
  })
})

describe('buildElbowGeometry', () => {
  const base = { sourceX: 0, sourceY: 0, targetX: 200, targetY: 100 }

  it('puts a vertical middle segment for left/right handles, shifted by offset', () => {
    const geom = buildElbowGeometry({ ...base, sourcePosition: Position.Right, offset: 30 })
    expect(geom.middleAxis).toBe('vertical')
    // centered midX would be 100; offset pushes it to 130
    expect(geom.midX).toBe(130)
    expect(geom.path).toContain('L 130,0')
    expect(geom.path).toContain('L 130,100')
  })

  it('puts a horizontal middle segment for top/bottom handles, shifted by offset', () => {
    const geom = buildElbowGeometry({ ...base, sourcePosition: Position.Bottom, offset: -20 })
    expect(geom.middleAxis).toBe('horizontal')
    // centered midY would be 50; offset pushes it to 30
    expect(geom.midY).toBe(30)
    expect(geom.path).toContain('L 0,30')
    expect(geom.path).toContain('L 200,30')
  })

  it('starts at the source and ends at the target', () => {
    const geom = buildElbowGeometry({ ...base, sourcePosition: Position.Right, offset: 0 })
    expect(geom.path.startsWith('M 0,0')).toBe(true)
    expect(geom.path.endsWith('L 200,100')).toBe(true)
  })
})
