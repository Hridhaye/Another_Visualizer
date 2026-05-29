import type { EdgeProps } from 'reactflow'

import { useEdgePath } from './useObstacleRoute'

const MARKER_DIM = 'bidir-arrow-dim'
const MARKER_BRIGHT = 'bidir-arrow-bright'
const MARKER_DIM_START = 'bidir-arrow-dim-start'
const MARKER_BRIGHT_START = 'bidir-arrow-bright-start'

// Directed-edge markers (used by MovableEdge): a clear arrow at the target end
// and a small dot at the source end. Exported as id strings so edges can build
// url(#id) references.
export const EDGE_ARROW_DIM = 'edge-arrow-dim'
export const EDGE_ARROW_BRIGHT = 'edge-arrow-bright'
export const EDGE_DOT_DIM = 'edge-dot-dim'
export const EDGE_DOT_BRIGHT = 'edge-dot-bright'

export function BiDirectionalEdgeMarkerDef() {
  return (
    <defs>
      <marker id={MARKER_DIM} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L0,8 L8,4 z" fill="rgba(148,163,184,0.55)" />
      </marker>
      <marker id={MARKER_BRIGHT} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L0,8 L8,4 z" fill="rgba(255,255,255,0.85)" />
      </marker>
      <marker id={MARKER_DIM_START} markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto">
        <path d="M8,0 L8,8 L0,4 z" fill="rgba(148,163,184,0.55)" />
      </marker>
      <marker id={MARKER_BRIGHT_START} markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto">
        <path d="M8,0 L8,8 L0,4 z" fill="rgba(255,255,255,0.85)" />
      </marker>

      {/* Larger, more visible arrowhead for directed edges. */}
      <marker id={EDGE_ARROW_DIM} markerWidth="12" markerHeight="12" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M0,0 L0,10 L10,5 z" fill="rgba(148,163,184,0.85)" />
      </marker>
      <marker id={EDGE_ARROW_BRIGHT} markerWidth="12" markerHeight="12" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M0,0 L0,10 L10,5 z" fill="rgba(255,255,255,0.95)" />
      </marker>

      {/* Small dot anchoring the source end of a directed edge. */}
      <marker id={EDGE_DOT_DIM} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto" markerUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="3" fill="rgba(148,163,184,0.85)" />
      </marker>
      <marker id={EDGE_DOT_BRIGHT} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto" markerUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="3" fill="rgba(255,255,255,0.95)" />
      </marker>
    </defs>
  )
}

export function BiDirectionalEdge({
  id,
  source, target,
  data,
}: EdgeProps) {
  const isHighlighted: boolean = data?.isOutgoingFromSelected ?? false

  const path = useEdgePath({ edgeId: id, sourceNodeId: source, targetNodeId: target })

  const color = isHighlighted ? 'rgba(255,255,255,0.85)' : 'rgba(148,163,184,0.55)'
  const markerEnd = isHighlighted ? `url(#${MARKER_BRIGHT})` : `url(#${MARKER_DIM})`
  const markerStart = isHighlighted ? `url(#${MARKER_BRIGHT_START})` : `url(#${MARKER_DIM_START})`
  const strokeWidth = isHighlighted ? 3 : 2.5

  return (
    <path
      d={path}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      markerEnd={markerEnd}
      markerStart={markerStart}
      style={{
        filter: isHighlighted ? 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' : 'none',
        transition: 'stroke 0.15s ease, stroke-width 0.15s ease, filter 0.15s ease',
      }}
    />
  )
}
