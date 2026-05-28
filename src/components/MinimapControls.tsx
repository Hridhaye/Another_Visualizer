import { MiniMap, Panel, type Node } from 'reactflow'

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
    <Panel position="top-right" style={{ margin: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
      <button
        onClick={onCycleState}
        className="minimap-toggle"
        aria-label="Toggle minimap state"
      >
        {minimapVisible ? (minimapCollapsed ? '+' : '−') : '⊞'}
      </button>
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
          style={{ ...minimapStyle, position: 'relative', top: 'unset', right: 'unset', margin: 0 }}
        />
      )}
    </Panel>
  )
}
