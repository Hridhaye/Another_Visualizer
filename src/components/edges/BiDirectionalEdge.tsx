import { getSmoothStepPath } from 'reactflow'
import type { EdgeProps } from 'reactflow'

function ArrowMarker({ id, color }: { id: string; color: string }) {
  return (
    <defs>
      <marker
        id={id}
        markerWidth="8"
        markerHeight="8"
        refX="7"
        refY="4"
        orient="auto"
      >
        <path d="M0,0 L0,8 L8,4 z" fill={color} />
      </marker>
      <marker
        id={`${id}-start`}
        markerWidth="8"
        markerHeight="8"
        refX="1"
        refY="4"
        orient="auto-start-reverse"
      >
        <path d="M0,0 L0,8 L8,4 z" fill={color} />
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
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0,
  })

  const isHighlighted = data?.isOutgoingFromSelected
  const color = isHighlighted ? 'rgba(255,255,255,0.85)' : 'rgba(148,163,184,0.55)'
  const markerId = `bidir-${id}`

  return (
    <>
      <ArrowMarker id={markerId} color={color} />
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={isHighlighted ? 3 : 2.5}
        markerEnd={`url(#${markerId})`}
        markerStart={`url(#${markerId}-start)`}
        style={{
          filter: isHighlighted ? 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' : 'none',
          transition: 'stroke 0.15s ease, stroke-width 0.15s ease, filter 0.15s ease',
        }}
      />
    </>
  )
}
