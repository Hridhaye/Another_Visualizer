import { useMemo } from 'react'

import type { CardData, NarrativeNode, SlipType } from '../types/narrative'

type ContextPanelProps = {
  selectedNode: NarrativeNode
  slipTypes: SlipType[]
  contextPanelPosition: { x: number; y: number }
  connectionSourceNodeId: string | null
  onClose: () => void
  onUpdate: (nodeId: string, patch: Partial<CardData>) => void
  onToggleLinkMode: (nodeId: string) => void
  onOpenFullEditor: () => void
}

const PANEL_OFFSET = 18
const VIEWPORT_MARGIN = 20

export function ContextPanel({
  selectedNode,
  slipTypes,
  contextPanelPosition,
  connectionSourceNodeId,
  onClose,
  onUpdate,
  onToggleLinkMode,
  onOpenFullEditor
}: ContextPanelProps) {
  const boundedPosition = useMemo(() => {
    const fallback = {
      left: contextPanelPosition.x + PANEL_OFFSET,
      top: contextPanelPosition.y + PANEL_OFFSET
    }
    if (typeof window === 'undefined') {
      return fallback
    }
    return {
      left: Math.max(
        VIEWPORT_MARGIN,
        Math.min(
          contextPanelPosition.x + PANEL_OFFSET,
          window.innerWidth - 180 - VIEWPORT_MARGIN // smaller width
        )
      ),
      top: Math.max(
        VIEWPORT_MARGIN,
        Math.min(
          contextPanelPosition.y + PANEL_OFFSET,
          window.innerHeight - 80 - VIEWPORT_MARGIN // smaller height
        )
      )
    }
  }, [contextPanelPosition.x, contextPanelPosition.y])

  const isLinkSource = connectionSourceNodeId === selectedNode.id

  return (
    <div
      className="absolute z-50 w-[180px] rounded-lg border border-zinc-700 bg-zinc-900/95 p-2 shadow-2xl backdrop-blur flex flex-col items-center gap-2"
      style={{
        left: boundedPosition.left,
        top: boundedPosition.top
      }}
    >
      <div className="flex w-full items-center justify-between mb-1">
        <span className="text-xs font-bold text-zinc-300">{selectedNode.data.code}</span>
        <button
          onClick={onClose}
          className="text-xs text-zinc-400 hover:text-white px-1"
          aria-label="Close contextual editor"
        >
          ×
        </button>
      </div>
      <div className="flex w-full justify-between gap-1">
        <button
          title="Edit"
          onClick={onOpenFullEditor}
          className="rounded bg-zinc-800 p-1 text-xs text-zinc-200 hover:bg-zinc-700 flex-1"
        >
          Edit
        </button>
        <button
          title="Link"
          onClick={() => onToggleLinkMode(selectedNode.id)}
          className={
            isLinkSource
              ? 'rounded bg-blue-500 p-1 text-xs text-white flex-1'
              : 'rounded bg-zinc-800 p-1 text-xs text-blue-200 hover:bg-blue-700 flex-1'
          }
        >
          {isLinkSource ? 'Target' : 'Link'}
        </button>
        <select
          title="Slip Color"
          value={selectedNode.data.slipTypeId}
          onChange={(event) => {
            onUpdate(selectedNode.id, { slipTypeId: event.target.value })
          }}
          className="rounded bg-zinc-800 p-1 text-xs text-zinc-200 flex-1"
        >
          {slipTypes.map((slip) => (
            <option key={slip.id} value={slip.id}>
              {slip.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
