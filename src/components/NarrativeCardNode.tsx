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
  const setLinkDrag = useNarrativeBoardStore((state) => state.setLinkDrag)
  const createReferenceConnection = useNarrativeBoardStore((state) => state.createReferenceConnection)
  const linkDragSourceId = useNarrativeBoardStore((state) => state.linkDragSourceId)
  const linkDragTargetId = useNarrativeBoardStore((state) => state.linkDragTargetId)
  const nodes = useNarrativeBoardStore((state) => state.nodes)
  const thisNode = nodes.find((n) => n.id === id)

  const slipColor = getSlipColor(slipTypes, data.slipTypeId)
  const isLinkSource = connectionSourceNodeId === id
  const isSelected = selectedNodeId === id
  const showContextPanel = isSelected && contextPanelOpen && !!thisNode
  const isDragSource = linkDragSourceId === id
  const isDragTarget = linkDragTargetId === id

  function handleClick(e: React.MouseEvent) {
    if (e.altKey) {
      if (linkDragSourceId === null) {
        // First alt+click: set this card as the link source
        setLinkDrag(id, null)
      } else if (linkDragSourceId !== id) {
        // Second alt+click on a different card: complete the link
        createReferenceConnection(linkDragSourceId, id)
        setLinkDrag(null, null)
      } else {
        // Alt+click the source card again: cancel
        setLinkDrag(null, null)
      }
      return
    }
    if (connectionSourceNodeId) return
    openContextPanel()
  }

  let extraShadow = ''
  if (isDragSource) extraShadow = ', 0 0 0 3px rgba(99,102,241,0.85)'
  else if (isDragTarget) extraShadow = ', 0 0 0 3px rgba(34,197,94,0.85)'

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
        cursor: isDragSource ? 'crosshair' : undefined,
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

      {isDragSource && (
        <div className="absolute -top-7 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-indigo-700/60 bg-indigo-950/90 px-2.5 py-1 text-[10px] font-semibold text-indigo-300 shadow-lg">
          {linkDragTargetId ? 'Release to link' : 'Drag to a card…'}
        </div>
      )}

      {isDragTarget && (
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] ring-2 ring-emerald-400/70" />
      )}

      {isLinkSource && (
        <div className="absolute -top-4 right-4 z-50">
          <div className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 shadow-lg">
            Click another card to connect
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  )
}
