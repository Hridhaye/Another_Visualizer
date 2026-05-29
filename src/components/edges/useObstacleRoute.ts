import { useMemo } from 'react'
import { useStore, type ReactFlowState } from 'reactflow'

import { useNarrativeBoardStore } from '../../store/useNarrativeBoardStore'
import { computeFloatingAnchors, buildFloatingElbow } from './floatingEdge'
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

  // Pull just the two endpoint rects from the ReactFlow store.
  const sourceSig = useStore((state: ReactFlowState) => rectSignature(rectOf(state, sourceNodeId)))
  const targetSig = useStore((state: ReactFlowState) => rectSignature(rectOf(state, targetNodeId)))

  return useMemo(() => {
    if (routed && routed.length >= 2) {
      return pointsToPath(routed)
    }

    const sourceRect = parseRect(sourceSig)
    const targetRect = parseRect(targetSig)
    if (!sourceRect || !targetRect) {
      return ''
    }

    const anchors = computeFloatingAnchors(sourceRect, targetRect)
    return pointsToPath(buildFloatingElbow(anchors))
  }, [routed, sourceSig, targetSig])
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
