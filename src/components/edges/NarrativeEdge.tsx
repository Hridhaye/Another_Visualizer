import { getBezierPath, BaseEdge } from 'reactflow'
import type { EdgeProps } from 'reactflow'

export function NarrativeEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const isHighlighted = data?.isOutgoingFromSelected

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        stroke: isHighlighted ? 'rgba(255,255,255,0.85)' : 'rgba(148,163,184,0.45)',
        strokeWidth: isHighlighted ? 2.5 : 1.5,
        filter: isHighlighted
          ? 'drop-shadow(0 0 4px rgba(255,255,255,0.6))'
          : 'none',
        transition: 'stroke 0.15s ease, stroke-width 0.15s ease, filter 0.15s ease',
      }}
    />
  )
}
