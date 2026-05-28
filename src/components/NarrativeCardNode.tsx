import { Handle, Position, type NodeProps } from 'reactflow'

import { ContextPanel } from './ContextPanel'
import { getSlipColor, useNarrativeBoardStore } from '../store/useNarrativeBoardStore'
import type { CardData } from '../types/narrative'

export function NarrativeCardNode({ id, data, selected }: NodeProps<CardData>) {
  void selected
  const slipTypes = useNarrativeBoardStore((state) => state.slipTypes)
  const selectedNodeId = useNarrativeBoardStore((state) => state.selectedNodeId)
  const connectionSourceNodeId = useNarrativeBoardStore((state) => state.connectionSourceNodeId)
  const contextPanelOpen = useNarrativeBoardStore((state) => state.contextPanelOpen)
  const openContextPanel = useNarrativeBoardStore((state) => state.openContextPanel)
  const closeContextPanel = useNarrativeBoardStore((state) => state.closeContextPanel)
  const updateNode = useNarrativeBoardStore((state) => state.updateNode)
  const deleteCard = useNarrativeBoardStore((state) => state.deleteCard)
  const setConnectionSourceNode = useNarrativeBoardStore((state) => state.setConnectionSourceNode)
  const createReferenceConnection = useNarrativeBoardStore((state) => state.createReferenceConnection)
  const nodes = useNarrativeBoardStore((state) => state.nodes)
  const thisNode = nodes.find((n) => n.id === id)

  const slipColor = getSlipColor(slipTypes, data.slipTypeId)
  const isLinkSource = connectionSourceNodeId === id
  const isSelected = selectedNodeId === id
  const isPendingTarget = !!connectionSourceNodeId && !isLinkSource
  const showContextPanel = isSelected && contextPanelOpen && !!thisNode

  function handleClick(e: React.MouseEvent) {
    if (e.altKey) {
      e.preventDefault()
      e.stopPropagation()

      if (!connectionSourceNodeId) {
        // First alt+click — set this card as the link source
        setConnectionSourceNode(id)
      } else if (connectionSourceNodeId === id) {
        // Alt+click the source again — cancel
        setConnectionSourceNode(null)
      } else {
        // Second alt+click on a different card — make the link then clear
        createReferenceConnection(connectionSourceNodeId, id)
        setConnectionSourceNode(null)
      }
      return
    }

    // Normal click — cancel any pending link mode, open context panel
    if (connectionSourceNodeId) {
      setConnectionSourceNode(null)
      return
    }

    openContextPanel()
  }

  let extraShadow = ''
  if (isLinkSource) extraShadow = ', 0 0 0 3px rgba(99,102,241,0.85)'
  else if (isPendingTarget) extraShadow = ', 0 0 0 2px rgba(99,102,241,0.3)'

  return (
    <div
      data-card-id={id}
      className={`card-shell relative ${isSelected ? 'card-selected' : ''}`}
      style={{
        border: `6px solid ${slipColor}`,
        backgroundColor: '#18181b',
        backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.03), rgba(255,255,255,0))',
        boxShadow: isSelected
          ? `0 0 0 2px rgba(59,130,246,0.45), 0 12px 34px rgba(0,0,0,0.5), inset 0 0 80px ${slipColor}22${extraShadow}`
          : `0 0 0 2px rgba(255,255,255,0.04), inset 0 0 80px ${slipColor}22${extraShadow}`,
        cursor: connectionSourceNodeId && !isLinkSource ? 'crosshair' : undefined,
      }}
      onClick={handleClick}
    >
      {showContextPanel && (
        <ContextPanel
          node={thisNode}
          allNodes={nodes}
          slipTypes={slipTypes}
          isLinkSource={isLinkSource}
          onUpdate={updateNode}
          onDelete={deleteCard}
          onClose={closeContextPanel}
          onToggleLink={() => setConnectionSourceNode(isLinkSource ? null : id)}
        />
      )}

      <Handle type="target" position={Position.Left} />

      <div className="card-header">
        <div className="card-code">{data.code}</div>
        <div className="card-title">{data.title}</div>
      </div>

      <div className="card-summary">{data.summary}</div>

      {data.referencesText && (
        <div className="mt-4 border-t border-zinc-700 pt-3 text-sm text-zinc-400">
          References: {data.referencesText}
        </div>
      )}

      {isLinkSource && (
        <div className="absolute -top-7 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-indigo-700/60 bg-indigo-950/90 px-2.5 py-1 text-[10px] font-semibold text-indigo-300 shadow-lg">
          Alt + click another card to link
        </div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  )
}
