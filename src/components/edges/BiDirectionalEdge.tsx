import { getSmoothStepPath } from 'reactflow'
import type { EdgeProps } from 'reactflow'

const MARKER_ID = 'bidir-arrowhead'

export function BiDirectionalEdgeMarkerDef() {
  return (
    <defs>
      <marker
        id={`${MARKER_ID}-dim`}
        markerWidth="8"
        markerHeight="8"
        refX="7"
        refY="4"
        orient="auto"
      >
        <path d="M0,0 L0,8 L8,4 z" fill="rgba(148,163,184,0.55)" />
      </marker>
      <marker
        id={`${MARKER_ID}-bright`}
        markerWidth="8"
        markerHeight="8"
        refX="7"
        refY="4"
        orient="auto"
      >
        <path d="M0,0 L0,8 L8,4 z" fill="rgba(255,255,255,0.85)" />
      </marker>
    </defs>
  )
}

export function BiDirectionalEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const shift: number = data?.lateralShift ?? 0

  const [forwardPath] = getSmoothStepPath({
    sourceX,
    sourceY: sourceY + shift,
    sourcePosition,
    targetX,
    targetY: targetY + shift,
    targetPosition,
    borderRadius: 0,
    offset: 40 + Math.abs(shift),
  })

  // Reversed path: swap source and target so markerEnd renders at the original source end
  const [reversePath] = getSmoothStepPath({
    sourceX: targetX,
    sourceY: targetY + shift,
    sourcePosition: targetPosition,
    targetX: sourceX,
    targetY: sourceY + shift,
    targetPosition: sourcePosition,
    borderRadius: 0,
    offset: 40 + Math.abs(shift),
  })

  const isHighlighted = data?.isOutgoingFromSelected
  const color = isHighlighted ? 'rgba(255,255,255,0.85)' : 'rgba(148,163,184,0.55)'
  const markerSuffix = isHighlighted ? 'bright' : 'dim'
  const strokeWidth = isHighlighted ? 3 : 2.5

  const sharedStyle = {
    filter: isHighlighted ? 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' : 'none',
    transition: 'stroke 0.15s ease, stroke-width 0.15s ease, filter 0.15s ease',
  }

  return (
    <>
      {/* Forward path: arrow at target end */}
      <path
        id={`${id}-fwd`}
        d={forwardPath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        markerEnd={`url(#${MARKER_ID}-${markerSuffix})`}
        style={sharedStyle}
      />
      {/* Reverse path (same geometry, opposite direction): arrow at source end */}
      <path
        id={`${id}-rev`}
        d={reversePath}
        fill="none"
        stroke="transparent"
        strokeWidth={strokeWidth}
        markerEnd={`url(#${MARKER_ID}-${markerSuffix})`}
        style={{ pointerEvents: 'none' }}
      />
    </>
  )
}
