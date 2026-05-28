import { getSmoothStepPath } from 'reactflow'
import type { EdgeProps } from 'reactflow'

const MARKER_DIM = 'bidir-arrow-dim'
const MARKER_BRIGHT = 'bidir-arrow-bright'

export function BiDirectionalEdgeMarkerDef() {
  return (
    <defs>
      <marker id={MARKER_DIM} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L0,8 L8,4 z" fill="rgba(148,163,184,0.55)" />
      </marker>
      <marker id={MARKER_BRIGHT} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L0,8 L8,4 z" fill="rgba(255,255,255,0.85)" />
      </marker>
    </defs>
  )
}

function buildPaths(
  sourceX: number, sourceY: number, sourcePosition: string,
  targetX: number, targetY: number, targetPosition: string,
  shift: number
) {
  const offset = 40 + Math.abs(shift)
  const [forward] = getSmoothStepPath({
    sourceX, sourceY: sourceY + shift, sourcePosition: sourcePosition as never,
    targetX, targetY: targetY + shift, targetPosition: targetPosition as never,
    borderRadius: 0, offset,
  })
  const [reverse] = getSmoothStepPath({
    sourceX: targetX, sourceY: targetY + shift, sourcePosition: targetPosition as never,
    targetX: sourceX, targetY: sourceY + shift, targetPosition: sourcePosition as never,
    borderRadius: 0, offset,
  })
  return { forward, reverse }
}

export function BiDirectionalEdge({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data,
}: EdgeProps) {
  const shift: number = data?.lateralShift ?? 0
  const isHighlighted: boolean = data?.isOutgoingFromSelected ?? false

  const { forward, reverse } = buildPaths(sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, shift)

  const color = isHighlighted ? 'rgba(255,255,255,0.85)' : 'rgba(148,163,184,0.55)'
  const marker = isHighlighted ? `url(#${MARKER_BRIGHT})` : `url(#${MARKER_DIM})`
  const strokeWidth = isHighlighted ? 3 : 2.5

  return (
    <>
      <path
        d={forward}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        markerEnd={marker}
        style={{
          filter: isHighlighted ? 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' : 'none',
          transition: 'stroke 0.15s ease, stroke-width 0.15s ease, filter 0.15s ease',
        }}
      />
      <path
        d={reverse}
        fill="none"
        stroke="transparent"
        strokeWidth={strokeWidth}
        markerEnd={marker}
      />
    </>
  )
}
