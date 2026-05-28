import { useMemo } from 'react'

import {
  PUZZLE_TYPES,
  type CardData,
  type NarrativeNode,
  type PuzzleType,
  type SlipType
} from '../types/narrative'

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

const PANEL_WIDTH = 280
const PANEL_HEIGHT = 340
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
          window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN
        )
      ),
      top: Math.max(
        VIEWPORT_MARGIN,
        Math.min(
          contextPanelPosition.y + PANEL_OFFSET,
          window.innerHeight - PANEL_HEIGHT - VIEWPORT_MARGIN
        )
      )
    }
  }, [contextPanelPosition.x, contextPanelPosition.y])

  const isLinkSource = connectionSourceNodeId === selectedNode.id

  return (
    <div
      className="absolute z-50 w-[280px] rounded-xl border border-zinc-700 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur"
      style={{
        left: boundedPosition.left,
        top: boundedPosition.top
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Selected Card
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            {selectedNode.data.code}
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-sm text-zinc-400 hover:text-white"
          aria-label="Close contextual editor"
        >
          x
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <input
          value={selectedNode.data.title}
          onChange={(event) => {
            onUpdate(selectedNode.id, { title: event.target.value })
          }}
          className="w-full rounded-md bg-zinc-800 px-3 py-2 text-sm"
          placeholder="Card title"
        />

        <textarea
          value={selectedNode.data.summary}
          onChange={(event) => {
            onUpdate(selectedNode.id, { summary: event.target.value })
          }}
          className="min-h-[90px] w-full rounded-md bg-zinc-800 px-3 py-2 text-sm"
          placeholder="Summary"
        />

        <div className="flex gap-2">
          <button
            onClick={() => {
              onToggleLinkMode(selectedNode.id)
            }}
            className={
              isLinkSource
                ? 'flex-1 rounded-md bg-blue-500 px-3 py-2 text-sm font-medium text-white'
                : 'flex-1 rounded-md bg-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-700'
            }
          >
            {isLinkSource ? 'Select Target' : 'Link Cards'}
          </button>

          <select
            value={selectedNode.data.puzzleType}
            onChange={(event) => {
              onUpdate(selectedNode.id, {
                puzzleType: event.target.value as PuzzleType
              })
            }}
            className="rounded-md bg-zinc-800 px-2 py-2 text-sm"
          >
            {PUZZLE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <select
            value={selectedNode.data.slipTypeId}
            onChange={(event) => {
              onUpdate(selectedNode.id, { slipTypeId: event.target.value })
            }}
            className="flex-1 rounded-md bg-zinc-800 px-2 py-2 text-sm"
          >
            {slipTypes.map((slip) => (
              <option key={slip.id} value={slip.id}>
                {slip.name}
              </option>
            ))}
          </select>

          <button
            onClick={onOpenFullEditor}
            className="rounded-md bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
          >
            Full Edit
          </button>
        </div>
      </div>
    </div>
  )
}
