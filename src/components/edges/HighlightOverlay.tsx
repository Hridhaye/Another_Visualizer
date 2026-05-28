import { createPortal } from 'react-dom'
import { useViewport, getSmoothStepPath } from 'reactflow'
import { useNarrativeBoardStore } from '../../store/useNarrativeBoardStore'
import { BiDirectionalEdgeMarkerDef } from './BiDirectionalEdge'

const MARKER_ID = 'bidir-arrowhead'
const LANE_SPACING = 12

function getShiftedPath(
  sourceX: number, sourceY: number, sourcePosition: string,
  targetX: number, targetY: number, targetPosition: string,
  shift: number
): string {
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY: sourceY + shift,
    sourcePosition: sourcePosition as never,
    targetX,
    targetY: targetY + shift,
    targetPosition: targetPosition as never,
    borderRadius: 0,
    offset: 40 + Math.abs(shift),
  })
  return path
}

function getReversedPath(
  sourceX: number, sourceY: number, sourcePosition: string,
  targetX: number, targetY: number, targetPosition: string,
  shift: number
): string {
  const [path] = getSmoothStepPath({
    sourceX: targetX,
    sourceY: targetY + shift,
    sourcePosition: targetPosition as never,
    targetX: sourceX,
    targetY: sourceY + shift,
    targetPosition: sourcePosition as never,
    borderRadius: 0,
    offset: 40 + Math.abs(shift),
  })
  return path
}

type OverlayEdge = {
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  shift: number
  isBidir: boolean
}

export function HighlightOverlay({ containerEl }: { containerEl: HTMLElement | null }) {
  const { x, y, zoom } = useViewport()
  const edges = useNarrativeBoardStore((s) => s.edges)
  const nodes = useNarrativeBoardStore((s) => s.nodes)
  const selectedNodeId = useNarrativeBoardStore((s) => s.selectedNodeId)

  if (!containerEl || !selectedNodeId) return null

  // For normal edges: selected node is the source.
  // For bidirectional edges: selected node may be source OR target (only one canonical edge exists).
  const highlightedEdges = edges.filter((e) =>
    e.source === selectedNodeId ||
    (e.data?.bidirectional === true && e.target === selectedNodeId)
  )
  if (highlightedEdges.length === 0) return null

  const sourceGroups: Record<string, string[]> = {}
  edges.forEach((edge) => {
    if (!sourceGroups[edge.source]) sourceGroups[edge.source] = []
    sourceGroups[edge.source].push(edge.id)
  })

  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  const overlayEdges: OverlayEdge[] = []

  for (const edge of highlightedEdges) {
    const isBidir = edge.data?.bidirectional === true
    // If selected node is the target of a bidir edge, treat it as if it were the source
    const flipped = isBidir && edge.target === selectedNodeId

    const fromId = flipped ? edge.target : edge.source
    const toId = flipped ? edge.source : edge.target

    const fromNode = nodeMap.get(fromId)
    const toNode = nodeMap.get(toId)
    if (!fromNode || !toNode) continue

    const fw = fromNode.width ?? 200
    const fh = fromNode.height ?? 100
    const th = toNode.height ?? 100

    const sourceX = fromNode.position.x + fw
    const sourceY = fromNode.position.y + fh / 2
    const targetX = toNode.position.x
    const targetY = toNode.position.y + th / 2

    const group = sourceGroups[edge.source] ?? []
    const indexInGroup = group.indexOf(edge.id)
    const groupSize = group.length
    const shift = (indexInGroup - (groupSize - 1) / 2) * LANE_SPACING

    overlayEdges.push({
      id: edge.id,
      sourceX,
      sourceY,
      targetX,
      targetY,
      shift,
      isBidir,
    })
  }

  if (overlayEdges.length === 0) return null

  const COLOR = 'rgba(255,255,255,0.85)'
  const STROKE_NORMAL = 1.5
  const STROKE_BIDIR = 3

  return createPortal(
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 10,
      }}
    >
      <BiDirectionalEdgeMarkerDef bright />
      <g style={{ transform: `translate(${x}px, ${y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
        {overlayEdges.map(({ id, sourceX, sourceY, targetX, targetY, shift, isBidir }) => {
          const forwardPath = getShiftedPath(sourceX, sourceY, 'right', targetX, targetY, 'left', shift)
          const strokeWidth = isBidir ? STROKE_BIDIR : STROKE_NORMAL

          return (
            <g key={id}>
              <path
                d={forwardPath}
                fill="none"
                stroke={COLOR}
                strokeWidth={strokeWidth}
                markerEnd={`url(#${MARKER_ID}-bright)`}
                style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' }}
              />
              {isBidir && (
                <path
                  d={getReversedPath(sourceX, sourceY, 'right', targetX, targetY, 'left', shift)}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={strokeWidth}
                  markerEnd={`url(#${MARKER_ID}-bright)`}
                />
              )}
            </g>
          )
        })}
      </g>
    </svg>,
    containerEl
  )
}
