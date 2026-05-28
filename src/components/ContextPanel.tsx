import { PUZZLE_TYPES, type CardData, type NarrativeNode, type SlipType } from '../types/narrative'

type ContextPanelProps = {
  node: NarrativeNode
  slipTypes: SlipType[]
  onUpdate: (nodeId: string, patch: Partial<CardData>) => void
  onClose: () => void
}

export function ContextPanel({ node, slipTypes, onUpdate, onClose }: ContextPanelProps) {
  return (
    <div
      className="nodrag nowheel absolute z-50 w-96 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
      style={{ bottom: 'calc(100% + 14px)', left: '50%', transform: 'translateX(-50%)' }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-zinc-700/60 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Quick Edit
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onClose() }}
          className="rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200"
        >
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="flex gap-3">
          <div className="w-24 shrink-0">
            <label className="text-xs text-zinc-500">Code</label>
            <input
              value={node.data.code}
              onChange={(e) => onUpdate(node.id, { code: e.target.value })}
              className="mt-1 w-full rounded-md bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-zinc-500">Title</label>
            <input
              value={node.data.title}
              onChange={(e) => onUpdate(node.id, { title: e.target.value })}
              className="mt-1 w-full rounded-md bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-500">Summary</label>
          <textarea
            value={node.data.summary}
            onChange={(e) => onUpdate(node.id, { summary: e.target.value })}
            rows={4}
            className="mt-1 w-full resize-none rounded-md bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-500">References</label>
          <input
            value={node.data.referencesText}
            onChange={(e) => onUpdate(node.id, { referencesText: e.target.value })}
            placeholder="AA02, AB03"
            className="mt-1 w-full rounded-md bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-zinc-500">Slip Type</label>
            <select
              value={node.data.slipTypeId}
              onChange={(e) => onUpdate(node.id, { slipTypeId: e.target.value })}
              className="mt-1 w-full rounded-md bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-500"
            >
              {slipTypes.map((slip) => (
                <option key={slip.id} value={slip.id}>{slip.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-zinc-500">Puzzle Type</label>
            <select
              value={node.data.puzzleType}
              onChange={(e) => onUpdate(node.id, { puzzleType: e.target.value as CardData['puzzleType'] })}
              className="mt-1 w-full rounded-md bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-500"
            >
              {PUZZLE_TYPES.map((pt) => (
                <option key={pt} value={pt}>{pt.charAt(0).toUpperCase() + pt.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
