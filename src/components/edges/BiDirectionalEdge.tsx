import type { EdgeProps } from 'reactflow'
import { useViewport } from 'reactflow'

import { useEdgePath } from './useObstacleRoute'

// Directed-edge markers (used by MovableEdge): a clear arrow at the target end
// and a small dot at the source end. Exported as id strings so edges can build
// url(#id) references.
export const EDGE_ARROW_DIM = 'edge-arrow-dim'
export const EDGE_ARROW_BRIGHT = 'edge-arrow-bright'
// Reversed arrow for the start of bidirectional edges.
export const EDGE_ARROW_REV_DIM = 'edge-arrow-rev-dim'
export const EDGE_ARROW_REV_BRIGHT = 'edge-arrow-rev-bright'
export const EDGE_DOT_DIM = 'edge-dot-dim'
export const EDGE_DOT_BRIGHT = 'edge-dot-bright'

export function BiDirectionalEdgeMarkerDef() {
  const { zoom } = useViewport()
  // Scale markers up as zoom decreases so they stay readable at any zoom level.
  // Clamped: never smaller than base (zoom > 1) and never more than 2.2× (very zoomed out).
  const s = Math.min(Math.max(1 / zoom, 1), 2.2)

  // Arrow: base tip at 16px, half-height 8px.
  const aw = Math.round(16 * s)
  const ah = Math.round(16 * s)
  const aHalf = ah / 2

  // Dot: base radius 5px, box 14px.
  const dr = Math.round(5 * s)
  const dc = Math.round(7 * s)
  const dBox = Math.round(14 * s)

  return (
    <defs>
      {/* Arrowhead — scales with zoom so it stays visible when zoomed out. */}
      <marker id={EDGE_ARROW_DIM} markerWidth={aw + 4} markerHeight={ah} refX={aw - 1} refY={aHalf} orient="auto" markerUnits="userSpaceOnUse">
        <path d={`M0,0 L0,${ah} L${aw},${aHalf} z`} fill="rgba(148,163,184,0.95)" stroke="rgba(0,0,0,0.5)" strokeWidth={1.5 * s} strokeLinejoin="round" />
      </marker>
      <marker id={EDGE_ARROW_BRIGHT} markerWidth={aw + 4} markerHeight={ah} refX={aw - 1} refY={aHalf} orient="auto" markerUnits="userSpaceOnUse">
        <path d={`M0,0 L0,${ah} L${aw},${aHalf} z`} fill="rgba(255,255,255,0.98)" stroke="rgba(0,0,0,0.4)" strokeWidth={1.5 * s} strokeLinejoin="round" />
      </marker>

      {/* Reversed arrowhead for the start of bidirectional edges. */}
      <marker id={EDGE_ARROW_REV_DIM} markerWidth={aw + 4} markerHeight={ah} refX="1" refY={aHalf} orient="auto" markerUnits="userSpaceOnUse">
        <path d={`M${aw},0 L${aw},${ah} L0,${aHalf} z`} fill="rgba(148,163,184,0.95)" stroke="rgba(0,0,0,0.5)" strokeWidth={1.5 * s} strokeLinejoin="round" />
      </marker>
      <marker id={EDGE_ARROW_REV_BRIGHT} markerWidth={aw + 4} markerHeight={ah} refX="1" refY={aHalf} orient="auto" markerUnits="userSpaceOnUse">
        <path d={`M${aw},0 L${aw},${ah} L0,${aHalf} z`} fill="rgba(255,255,255,0.98)" stroke="rgba(0,0,0,0.4)" strokeWidth={1.5 * s} strokeLinejoin="round" />
      </marker>

      {/* Source dot — scales with zoom. */}
      <marker id={EDGE_DOT_DIM} markerWidth={dBox} markerHeight={dBox} refX={dc} refY={dc} orient="auto" markerUnits="userSpaceOnUse">
        <circle cx={dc} cy={dc} r={dr} fill="rgba(148,163,184,0.95)" stroke="rgba(0,0,0,0.5)" strokeWidth={2 * s} />
      </marker>
      <marker id={EDGE_DOT_BRIGHT} markerWidth={dBox} markerHeight={dBox} refX={dc} refY={dc} orient="auto" markerUnits="userSpaceOnUse">
        <circle cx={dc} cy={dc} r={dr} fill="rgba(255,255,255,0.98)" stroke="rgba(0,0,0,0.4)" strokeWidth={2 * s} />
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
  const { zoom } = useViewport()
  const scale = Math.min(2, 1 / zoom)

  const color = isHighlighted ? 'rgba(255,255,255,0.85)' : 'rgba(148,163,184,0.55)'
  const markerEnd = isHighlighted ? `url(#${EDGE_ARROW_BRIGHT})` : `url(#${EDGE_ARROW_DIM})`
  const markerStart = isHighlighted ? `url(#${EDGE_ARROW_REV_BRIGHT})` : `url(#${EDGE_ARROW_REV_DIM})`
  const strokeWidth = (isHighlighted ? 3 : 2.25) * scale

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
