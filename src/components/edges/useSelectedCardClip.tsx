import { useViewport } from 'reactflow'
import { useNarrativeBoardStore } from '../../store/useNarrativeBoardStore'

// Returns an SVG clipPath `d` string that covers everything except the selected card,
// in screen-pixel coordinates (so it can be used outside the flow transform group).
export function useSelectedCardClip(clipId: string): { clipDef: React.ReactNode; clipUrl: string } | null {
  const { x: panX, y: panY, zoom } = useViewport()
  const selectedNodeId = useNarrativeBoardStore((s) => s.selectedNodeId)
  const nodes = useNarrativeBoardStore((s) => s.nodes)

  if (!selectedNodeId) return null

  const node = nodes.find((n) => n.id === selectedNodeId)
  if (!node) return null

  const w = node.width ?? 200
  const h = node.height ?? 100

  // Convert node position (flow coords) to screen coords
  const sx = node.position.x * zoom + panX
  const sy = node.position.y * zoom + panY
  const sw = w * zoom
  const sh = h * zoom

  // Large outer rect minus the card rect, using even-odd fill rule
  const BIG = 100000
  const outer = `M${-BIG},${-BIG} L${BIG},${-BIG} L${BIG},${BIG} L${-BIG},${BIG} Z`
  const hole = `M${sx},${sy} L${sx + sw},${sy} L${sx + sw},${sy + sh} L${sx},${sy + sh} Z`

  const clipDef = (
    <defs>
      <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
        <path d={`${outer} ${hole}`} fillRule="evenodd" />
      </clipPath>
    </defs>
  )

  return { clipDef, clipUrl: `url(#${clipId})` }
}
