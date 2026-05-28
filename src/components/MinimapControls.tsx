import { MiniMap, type Node } from 'reactflow'

import { getSlipColor } from '../store/useNarrativeBoardStore'
import type { CardData, SlipType } from '../types/narrative'

type MinimapControlsProps = {
  minimapVisible: boolean
  minimapCollapsed: boolean
  slipTypes: SlipType[]
  onCycleState: () => void
}

export function MinimapControls({
  minimapVisible,
  minimapCollapsed,
  slipTypes,
  onCycleState
}: MinimapControlsProps) {
  const minimapStyle = minimapCollapsed
    ? {
        width: 42,
        height: 42,
        backgroundColor: '#111111',
        border: '1px solid #27272a',
        borderRadius: 10
      }
    : {
        width: 180,
        height: 180,
        backgroundColor: '#111111',
        border: '1px solid #27272a',
        borderRadius: 12
      }

  const minimapNodeStrokeWidth = minimapCollapsed ? 2 : 1

  return (
    <>
      {minimapVisible && (
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) => {
            const typedNode = node as Node<CardData>
            return getSlipColor(slipTypes, typedNode.data.slipTypeId)
          }}
          maskColor="rgba(0,0,0,0.75)"
          nodeStrokeWidth={minimapNodeStrokeWidth}
          nodeBorderRadius={2}
          style={minimapStyle}
        />
      )}

      <button
        onClick={onCycleState}
        className="absolute bottom-4 right-4 z-50 flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-sm hover:bg-zinc-800"
        aria-label="Toggle minimap state"
      >
        {minimapVisible ? (minimapCollapsed ? '+' : '-') : '[]'}
      </button>
    </>
  )
}
