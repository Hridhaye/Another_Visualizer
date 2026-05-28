import { Handle, Position, type NodeProps } from 'reactflow'

import { getSlipColor, useNarrativeBoardStore } from '../store/useNarrativeBoardStore'
import type { CardData } from '../types/narrative'

export function NarrativeCardNode({ id, data, selected }: NodeProps<CardData>) {
  const slipTypes = useNarrativeBoardStore((state) => state.slipTypes)
  const connectionSourceNodeId = useNarrativeBoardStore(
    (state) => state.connectionSourceNodeId
  )
  const setConnectionSourceNode = useNarrativeBoardStore(
    (state) => state.setConnectionSourceNode
  )
  const setSelectedNode = useNarrativeBoardStore((state) => state.setSelectedNode)
  const openFullEditor = useNarrativeBoardStore((state) => state.openFullEditor)

  const slipColor = getSlipColor(slipTypes, data.slipTypeId)
  const isLinkSource = connectionSourceNodeId === id

  return (
    <div
      className={`card-shell group relative ${selected ? 'card-selected' : ''}`}
      style={{
        border: `6px solid ${slipColor}`,
        backgroundColor: '#18181b',
        backgroundImage:
          'linear-gradient(to bottom, rgba(255,255,255,0.03), rgba(255,255,255,0))',
        boxShadow: selected
          ? `0 0 0 2px rgba(59,130,246,0.45), 0 12px 34px rgba(0,0,0,0.5), inset 0 0 80px ${slipColor}22`
          : `0 0 0 2px rgba(255,255,255,0.04), inset 0 0 80px ${slipColor}22`
      }}
    >
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
        <div className="absolute -top-4 right-4 z-50 flex items-center gap-2">
          <div className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 shadow-lg">
            Click another card to connect
          </div>
        </div>
      )}

      <div className="absolute -bottom-4 left-1/2 z-50 flex -translate-x-1/2 gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={(event) => {
            event.stopPropagation()
            setSelectedNode(id)
            openFullEditor()
          }}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200 shadow-lg"
        >
          Edit
        </button>

        <button
          onClick={(event) => {
            event.stopPropagation()
            setSelectedNode(id)
            setConnectionSourceNode(isLinkSource ? null : id)
          }}
          className="rounded-md border border-blue-700 bg-blue-900/90 px-2 py-1 text-[11px] text-blue-100 shadow-lg"
        >
          {isLinkSource ? 'Cancel' : 'Link'}
        </button>
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  )
}
