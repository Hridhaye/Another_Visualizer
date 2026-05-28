import { getSmoothStepPath } from 'reactflow'
import type { EdgeProps } from 'reactflow'

const ARROW_SIZE = 8

function ArrowMarker({ id, color }: { id: string; color: string }) {
  return (
    <defs>
      <marker
        id={id}
        markerWidth={ARROW_SIZE}
        markerHeight={ARROW_SIZE}
        refX={ARROW_SIZE - 1}
        refY={ARROW_SIZE / 2}
        orient="auto"
      >
        <path
          d={`M0,0 L0,${ARROW_SIZE} L${ARROW_SIZE},${ARROW_SIZE / 2} z`}
          fill={color}
        />
      </marker>
      <marker
        id={`${id}-start`}
        markerWidth={ARROW_SIZE}
        markerHeight={ARROW_SIZE}
        refX={1}
        refY={ARROW_SIZE / 2}
        orient="auto-start-reverse"
      >
        <path
          d={`M0,0 L0,${ARROW_SIZE} L${ARROW_SIZE},${ARROW_SIZE / 2} z`}
          fill={color}
        />
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
    borderRadius: 16,
  })

  const isHighlighted = data?.isOutgoingFromSelected

  const color = isHighlighted ? 'rgba(251,191,36,1)' : 'rgba(251,191,36,0.6)'
  const markerId = `bidir-arrow-${id}`

  return (
    <>
      <ArrowMarker id={markerId} color={color} />
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={isHighlighted ? 2.5 : 1.8}
        strokeDasharray="6 3"
        markerEnd={`url(#${markerId})`}
        markerStart={`url(#${markerId}-start)`}
        style={{
          filter: isHighlighted
            ? 'drop-shadow(0 0 5px rgba(251,191,36,0.8))'
            : 'drop-shadow(0 0 2px rgba(251,191,36,0.3))',
          transition: 'stroke 0.15s ease, stroke-width 0.15s ease, filter 0.15s ease',
        }}
      />
    </>
  )
}
