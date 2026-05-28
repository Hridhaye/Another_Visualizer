
import { PUZZLE_TYPES, type CardData, type NarrativeNode, type PuzzleType, type SlipType } from '../types/narrative'

const PANEL_WIDTH = 288
const PANEL_APPROX_HEIGHT = 420
const PADDING = 12

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
  const vw = window.innerWidth
  const vh = window.innerHeight
  const x = Math.min(Math.max(contextPanelPosition.x, PADDING), vw - PANEL_WIDTH - PADDING)
  const y = Math.min(Math.max(contextPanelPosition.y, PADDING), vh - PANEL_APPROX_HEIGHT - PADDING)

  const fieldInputClass = "w-full bg-zinc-800/60 px-2.5 py-1.5 text-xs text-zinc-100 border border-zinc-700/60 rounded focus:outline-none focus:ring-1 focus:ring-blue-500/70 focus:border-blue-500/50 transition-colors"
  const fieldLabelClass = "text-[10px] font-medium uppercase tracking-wide text-zinc-400"

  return (
    <div
      className="fixed z-50 w-72 rounded-lg border border-zinc-700/50 bg-zinc-900/85 shadow-lg backdrop-blur-sm"
      style={{ left: x, top: y }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800/40 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="text-[9px] uppercase tracking-widest text-zinc-500">Card</div>
          <div className="font-medium text-zinc-100 text-sm">{selectedNode.data.code}</div>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-200 transition-colors p-1 flex-shrink-0"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 2l12 12M14 2L2 14" />
          </svg>
        </button>
      </div>

      {/* Fields Container */}
      <div className="space-y-3 px-3 py-3">
        {/* Code */}
        <div className="space-y-1.5">
          <label className={fieldLabelClass}>Code</label>
          <input
            className={fieldInputClass}
            value={selectedNode.data.code}
            onChange={e => onUpdate(selectedNode.id, { code: e.target.value })}
          />
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className={fieldLabelClass}>Title</label>
          <input
            className={fieldInputClass}
            value={selectedNode.data.title}
            onChange={e => onUpdate(selectedNode.id, { title: e.target.value })}
          />
        </div>

        {/* Summary */}
        <div className="space-y-1.5">
          <label className={fieldLabelClass}>Summary</label>
          <textarea
            className={`${fieldInputClass} min-h-16 resize-none`}
            value={selectedNode.data.summary}
            onChange={e => onUpdate(selectedNode.id, { summary: e.target.value })}
          />
        </div>

        {/* References */}
        <div className="space-y-1.5">
          <label className={fieldLabelClass}>References</label>
          <input
            className={fieldInputClass}
            value={selectedNode.data.referencesText}
            onChange={e => onUpdate(selectedNode.id, { referencesText: e.target.value })}
            placeholder="AA02, AB03"
          />
        </div>

        {/* Slip Type & Puzzle Type - Side by side */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1.5">
            <label className={fieldLabelClass}>Slip</label>
            <select
              className={fieldInputClass}
              value={selectedNode.data.slipTypeId}
              onChange={e => onUpdate(selectedNode.id, { slipTypeId: e.target.value })}
            >
              {slipTypes.map(slip => (
                <option key={slip.id} value={slip.id}>{slip.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={fieldLabelClass}>Puzzle</label>
            <select
              className={fieldInputClass}
              value={selectedNode.data.puzzleType}
              onChange={e => onUpdate(selectedNode.id, { puzzleType: e.target.value as PuzzleType })}
            >
              {PUZZLE_TYPES.map(type => (
                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
