
import { PUZZLE_TYPES, type CardData, type NarrativeNode, type PuzzleType, type SlipType } from '../types/narrative'

type ContextPanelProps = {
  selectedNode: NarrativeNode
  slipTypes: SlipType[]
  contextPanelPosition: { x: number; y: number }
  onClose: () => void
  onUpdate: (nodeId: string, patch: Partial<CardData>) => void
}

export function ContextPanel({
  selectedNode,
  slipTypes,
  contextPanelPosition,
  onClose,
  onUpdate
}: ContextPanelProps) {
  return (
    <div
      className="absolute z-50 w-[280px] rounded-xl border border-zinc-700 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur flex flex-col gap-3"
      style={{
        left: contextPanelPosition.x,
        top: contextPanelPosition.y
      }}
    >
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Context</div>
          <div className="text-sm font-semibold text-zinc-100">{selectedNode.data.code}</div>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-zinc-400 hover:text-white px-1"
          aria-label="Close contextual panel"
        >
          ×
        </button>
      </div>
      <div className="flex flex-col gap-2 text-xs">
        <label className="text-zinc-400">Code</label>
        <input
          className="rounded-md bg-zinc-800 px-2 py-1.5 text-zinc-100 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedNode.data.code}
          onChange={e => onUpdate(selectedNode.id, { code: e.target.value })}
        />

        <label className="text-zinc-400">Title</label>
        <input
          className="rounded-md bg-zinc-800 px-2 py-1.5 text-zinc-100 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedNode.data.title}
          onChange={e => onUpdate(selectedNode.id, { title: e.target.value })}
        />

        <label className="text-zinc-400">Summary</label>
        <textarea
          className="min-h-[70px] rounded-md bg-zinc-800 px-2 py-1.5 text-zinc-100 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedNode.data.summary}
          onChange={e => onUpdate(selectedNode.id, { summary: e.target.value })}
        />

        <label className="text-zinc-400">References</label>
        <input
          className="rounded-md bg-zinc-800 px-2 py-1.5 text-zinc-100 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedNode.data.referencesText}
          onChange={e => onUpdate(selectedNode.id, { referencesText: e.target.value })}
          placeholder="AA02, AB03"
        />

        <label className="text-zinc-400">Slip Type</label>
        <select
          className="rounded-md bg-zinc-800 px-2 py-1.5 text-zinc-100 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedNode.data.slipTypeId}
          onChange={e => onUpdate(selectedNode.id, { slipTypeId: e.target.value })}
        >
          {slipTypes.map(slip => (
            <option key={slip.id} value={slip.id}>{slip.name}</option>
          ))}
        </select>

        <label className="text-zinc-400">Puzzle Type</label>
        <select
          className="rounded-md bg-zinc-800 px-2 py-1.5 text-zinc-100 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedNode.data.puzzleType}
          onChange={e => onUpdate(selectedNode.id, { puzzleType: e.target.value as PuzzleType })}
        >
          {PUZZLE_TYPES.map(type => (
            <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
