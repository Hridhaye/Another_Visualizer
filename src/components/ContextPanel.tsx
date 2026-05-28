import { useState } from 'react'
import { PUZZLE_TYPES, type CardData, type NarrativeNode, type SlipType } from '../types/narrative'

type ContextPanelProps = {
  node: NarrativeNode
  slipTypes: SlipType[]
  onUpdate: (nodeId: string, patch: Partial<CardData>) => void
  onClose: () => void
}

type ActiveField = 'code' | 'title' | 'summary' | 'references' | 'slipType' | 'puzzleType' | null

export function ContextPanel({ node, slipTypes, onUpdate, onClose }: ContextPanelProps) {
  const [activeField, setActiveField] = useState<ActiveField>(null)

  function toggleField(field: ActiveField) {
    setActiveField((prev) => (prev === field ? null : field))
  }

  const currentSlipName = slipTypes.find((s) => s.id === node.data.slipTypeId)?.name ?? 'Slip'
  const currentPuzzle = node.data.puzzleType.charAt(0).toUpperCase() + node.data.puzzleType.slice(1)

  return (
    <div
      className="nodrag nowheel absolute z-50"
      style={{ bottom: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)' }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Popover above the button bar */}
      {activeField && (
        <div className="mb-2 w-72 rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-xl">
          {activeField === 'code' && (
            <input
              autoFocus
              value={node.data.code}
              onChange={(e) => onUpdate(node.id, { code: e.target.value })}
              placeholder="Code"
              className="w-full rounded-md bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-500"
            />
          )}
          {activeField === 'title' && (
            <input
              autoFocus
              value={node.data.title}
              onChange={(e) => onUpdate(node.id, { title: e.target.value })}
              placeholder="Title"
              className="w-full rounded-md bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-500"
            />
          )}
          {activeField === 'summary' && (
            <textarea
              autoFocus
              value={node.data.summary}
              onChange={(e) => onUpdate(node.id, { summary: e.target.value })}
              rows={4}
              className="w-full resize-none rounded-md bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-500"
            />
          )}
          {activeField === 'references' && (
            <input
              autoFocus
              value={node.data.referencesText}
              onChange={(e) => onUpdate(node.id, { referencesText: e.target.value })}
              placeholder="AA02, AB03"
              className="w-full rounded-md bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-500"
            />
          )}
          {activeField === 'slipType' && (
            <div className="flex flex-col gap-1">
              {slipTypes.map((slip) => (
                <button
                  key={slip.id}
                  onClick={() => { onUpdate(node.id, { slipTypeId: slip.id }); setActiveField(null) }}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left hover:bg-zinc-700 ${node.data.slipTypeId === slip.id ? 'bg-zinc-700' : ''}`}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: slip.color }} />
                  {slip.name}
                </button>
              ))}
            </div>
          )}
          {activeField === 'puzzleType' && (
            <div className="flex flex-col gap-1">
              {PUZZLE_TYPES.map((pt) => (
                <button
                  key={pt}
                  onClick={() => { onUpdate(node.id, { puzzleType: pt }); setActiveField(null) }}
                  className={`rounded-md px-3 py-2 text-sm text-left hover:bg-zinc-700 ${node.data.puzzleType === pt ? 'bg-zinc-700' : ''}`}
                >
                  {pt.charAt(0).toUpperCase() + pt.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Button bar */}
      <div className="flex items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-1.5 shadow-xl">
        {(
          [
            { field: 'code', label: node.data.code },
            { field: 'title', label: node.data.title.length > 14 ? node.data.title.slice(0, 14) + '…' : node.data.title },
            { field: 'summary', label: 'Summary' },
            { field: 'references', label: 'Refs' },
            { field: 'slipType', label: currentSlipName },
            { field: 'puzzleType', label: currentPuzzle },
          ] as { field: ActiveField; label: string }[]
        ).map(({ field, label }) => (
          <button
            key={field}
            onClick={() => toggleField(field)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeField === field
                ? 'bg-zinc-600 text-zinc-100'
                : 'text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100'
            }`}
          >
            {label}
          </button>
        ))}

        <div className="mx-1 h-4 w-px bg-zinc-700" />

        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
