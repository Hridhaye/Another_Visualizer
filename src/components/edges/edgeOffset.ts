import { Position } from 'reactflow'

/**
 * Resolves the stored middle-segment offset for an edge.
 * `manualOffset` (set by dragging) wins; otherwise the lane-based `lateralShift`
 * computed in App.tsx is used as a sensible default; otherwise 0.
 */
export function resolveEdgeOffset(data?: { manualOffset?: number; lateralShift?: number }): number {
  if (typeof data?.manualOffset === 'number') {
    return data.manualOffset
  }
  if (typeof data?.lateralShift === 'number') {
    return data.lateralShift
  }
  return 0
}

export type Axis = 'horizontal' | 'vertical'

export interface ElbowGeometry {
  /** SVG path string: source -> two bends -> target, sharp 90° corners. */
  path: string
  /** Midpoint of the draggable middle segment (flow coordinates). */
  midX: number
  midY: number
  /**
   * Orientation of the middle segment. 'vertical' means it runs up/down, so it
   * is dragged left/right. 'horizontal' means it runs left/right, dragged up/down.
   */
  middleAxis: Axis
}

function isHorizontalHandle(position: Position): boolean {
  return position === Position.Left || position === Position.Right
}

/**
 * Builds a 3-segment orthogonal "elbow" connector between two handles, where the
 * middle segment is shifted by `offset` from its centered position.
 *
 * For left/right handles the middle segment is vertical: it sits at
 * `centerX + offset` and is dragged horizontally.
 * For top/bottom handles the middle segment is horizontal: it sits at
 * `centerY + offset` and is dragged vertically.
 *
 * The stubs leaving each handle keep a minimum length so the line always exits
 * the node cleanly even when the offset pushes the middle segment past a node.
 */
export function buildElbowGeometry(params: {
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: Position
  offset: number
}): ElbowGeometry {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, offset } = params

  if (isHorizontalHandle(sourcePosition)) {
    // Middle segment is vertical; offset moves it left/right.
    const midX = (sourceX + targetX) / 2 + offset
    const path = [
      `M ${sourceX},${sourceY}`,
      `L ${midX},${sourceY}`,
      `L ${midX},${targetY}`,
      `L ${targetX},${targetY}`,
    ].join(' ')
    return {
      path,
      midX,
      midY: (sourceY + targetY) / 2,
      middleAxis: 'vertical',
    }
  }

  // Top/bottom handles: middle segment is horizontal; offset moves it up/down.
  const midY = (sourceY + targetY) / 2 + offset
  const path = [
    `M ${sourceX},${sourceY}`,
    `L ${sourceX},${midY}`,
    `L ${targetX},${midY}`,
    `L ${targetX},${targetY}`,
  ].join(' ')
  return {
    path,
    midX: (sourceX + targetX) / 2,
    midY,
    middleAxis: 'horizontal',
  }
}
