import { type EdgeProps } from 'reactflow'

import { useNarrativeBoardStore } from '../../store/useNarrativeBoardStore'
import { useEdgePath } from './useObstacleRoute'
import {
  EDGE_ARROW_BRIGHT,
  EDGE_ARROW_DIM,
  EDGE_DOT_BRIGHT,
  EDGE_DOT_DIM,
} from './BiDirectionalEdge'

export function MovableEdge({
  id,
  source,
  target,
  style = {},
  data,
}: EdgeProps) {
  const isHighlighted: boolean = data?.isOutgoingFromSelected ?? false
  const sourceColor = useNarrativeBoardStore((state) => state.edgeColors[id])

  // Floating elbow by default (anchors face the partner card); replaced by an
  // A*-routed path once "Tidy lines" runs. Manual middle-segment offsetting
  // (edgeOffset.ts / useSegmentDrag.ts) is kept in the codebase but unused.
  const path = useEdgePath({ edgeId: id, sourceNodeId: source, targetNodeId: target })

  // Direction is shown by a dot at the source end and an arrow at the target end.
  const markerEnd = `url(#${isHighlighted ? EDGE_ARROW_BRIGHT : EDGE_ARROW_DIM})`
  const markerStart = `url(#${isHighlighted ? EDGE_DOT_BRIGHT : EDGE_DOT_DIM})`

  const dimColor = sourceColor ?? 'rgba(148,163,184,0.75)'

  const highlightStyle = isHighlighted
    ? {
        stroke: 'rgba(255,255,255,0.85)',
        strokeWidth: 3,
        filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.6))',
      }
    : {
        stroke: dimColor,
        strokeWidth: 2.25,
      }

  return (
    <path
      id={id}
      style={{
        ...style,
        ...highlightStyle,
        transition: 'stroke 0.15s ease, stroke-width 0.15s ease, filter 0.15s ease',
      }}
      className="react-flow__edge-path"
      d={path}
      markerStart={markerStart}
      markerEnd={markerEnd}
    />
  )
}
