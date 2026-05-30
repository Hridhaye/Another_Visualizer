import { useMemo } from 'react'
import { useStore, type ReactFlowState } from 'reactflow'

import { HIGHLIGHT_SCALE, useNarrativeBoardStore } from '../../store/useNarrativeBoardStore'
import { computeFloatingAnchors, buildFloatingElbow, inflateRect } from './floatingEdge'
import { pointsToPath, type Rect } from './routeOrthogonal'

interface UseEdgePathParams {
  edgeId: string
  sourceNodeId: string
  targetNodeId: string
}

function rectSignature(rect: Rect | null): string {
  if (!rect) return ''
  return `${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.width)},${Math.round(rect.height)}`
}

/**
 * Returns the SVG path for an edge.
 *
 * Cheap by default: it derives floating anchors (sides facing the partner card)
 * and a simple orthogonal elbow from just the two endpoint rects — no A*, no
 * scanning every node. If "Tidy lines" has produced an A*-routed polyline for
 * this edge, that is used instead. This keeps dragging smooth even with many
 * cards; obstacle avoidance is computed on demand in App.tsx, not here.
 */
export function useEdgePath(params: UseEdgePathParams): string {
  const { edgeId, sourceNodeId, targetNodeId } = params

  const routed = useNarrativeBoardStore((state) => state.routedPaths[edgeId])

  // A highlighted card is grown via a centered CSS transform, which does NOT
  // change the layout box ReactFlow measures. We inflate the endpoint rect by
  // the same factor here so the connector meets the card's visible (grown) edge
  // instead of ending under it.
  const sourceHighlighted = useNarrativeBoardStore((state) => state.highlightedNodeIds.includes(sourceNodeId))
  const targetHighlighted = useNarrativeBoardStore((state) => state.highlightedNodeIds.includes(targetNodeId))

  // Pull both endpoint rects in a SINGLE ReactFlow store selector returning one
  // combined signature string. ReactFlow runs each subscribed selector on every
  // store tick (every drag/pan frame, for every edge), so collapsing two
  // selectors into one halves the per-edge per-frame work and subscription
  // count. The equality bail-out still means the useMemo below only recomputes
  // when THIS edge's endpoints actually move.
  const endpointSig = useStore((state: ReactFlowState) =>
    rectSignature(rectOf(state, sourceNodeId)) + '|' + rectSignature(rectOf(state, targetNodeId))
  )

  return useMemo(() => {
    if (routed && routed.length >= 2) {
      return pointsToPath(routed)
    }

    const [sourceSig, targetSig] = endpointSig.split('|')
    const sourceRect = inflateRect(parseRect(sourceSig), sourceHighlighted ? HIGHLIGHT_SCALE : 1)
    const targetRect = inflateRect(parseRect(targetSig), targetHighlighted ? HIGHLIGHT_SCALE : 1)
    if (!sourceRect || !targetRect) {
      return ''
    }

    const anchors = computeFloatingAnchors(sourceRect, targetRect)
    return pointsToPath(buildFloatingElbow(anchors))
  }, [routed, endpointSig, sourceHighlighted, targetHighlighted])
}

function rectOf(state: ReactFlowState, nodeId: string): Rect | null {
  const node = state.nodeInternals.get(nodeId)
  if (!node) return null
  const pos = node.positionAbsolute ?? node.position
  const width = node.width ?? 0
  const height = node.height ?? 0
  if (!width || !height) return null
  return { x: pos.x, y: pos.y, width, height }
}

function parseRect(sig: string): Rect | null {
  if (!sig) return null
  const [x, y, width, height] = sig.split(',').map(Number)
  return { x, y, width, height }
}
