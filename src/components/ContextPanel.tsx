import { useState } from 'react'
import { parseReferences } from '../graph/buildEdgesFromReferences'
import { PUZZLE_TYPES, type CardData, type NarrativeNode, type SlipType } from '../types/narrative'

type ContextPanelProps = {
  node: NarrativeNode
  allNodes: NarrativeNode[]
  slipTypes: SlipType[]
  isLinkSource: boolean
  onUpdate: (nodeId: string, patch: Partial<CardData>) => void
  onDelete: (nodeId: string) => void
  onClose: () => void
  onToggleLink: () => void
}

type ActiveField = 'code' | 'title' | 'summary' | 'references' | 'slipType' | 'puzzleType' | null

const BUTTONS: { field: ActiveField; label: string }[] = [
  { field: 'code', label: 'Code' },
  { field: 'title', label: 'Title' },
  { field: 'summary', label: 'Summary' },
  { field: 'references', label: 'Link & Refs' },
  { field: 'slipType', label: 'Slip' },
  { field: 'puzzleType', label: 'Puzzle' }
]

export function ContextPanel({ node, allNodes, slipTypes, isLinkSource, onUpdate, onDelete, onClose, onToggleLink }: ContextPanelProps) {
  const [activeField, setActiveField] = useState<ActiveField>(null)
  const [refSearch, setRefSearch] = useState('')

  function toggleField(field: ActiveField) {
    setActiveField((prev) => (prev === field ? null : field))
    setRefSearch('')
  }

  const currentRefs = parseReferences(node.data.referencesText)

  function addRef(code: string) {
    const next = currentRefs.includes(code)
      ? currentRefs
      : [...currentRefs, code]
    onUpdate(node.id, { referencesText: next.join(', ') })
  }

  function removeRef(code: string) {
    onUpdate(node.id, {
      referencesText: currentRefs.filter((r) => r !== code).join(', ')
    })
  }

  const otherNodes = allNodes.filter((n) => n.id !== node.id)
  const searchLower = refSearch.toLowerCase()
  const filteredNodes = otherNodes.filter(
    (n) =>
      n.data.code.toLowerCase().includes(searchLower) ||
      n.data.title.toLowerCase().includes(searchLower)
  )

  return (
    <div
      className="nodrag nowheel absolute z-50"
      style={{ bottom: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)' }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {activeField && (
        <div className="mb-2 w-72 rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-xl">
          {(activeField === 'code' || activeField === 'title') && (
            <input
              autoFocus
              value={activeField === 'code' ? node.data.code : node.data.title}
              onChange={(e) =>
                onUpdate(node.id, { [activeField]: e.target.value })
              }
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
            <div className="flex flex-col gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleLink() }}
                className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                  isLinkSource
                    ? 'bg-blue-700 text-blue-100 hover:bg-blue-600'
                    : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                }`}
              >
                {isLinkSource ? 'Cancel card-link mode' : 'Link by clicking a card'}
              </button>

              {currentRefs.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {currentRefs.map((code) => (
                    <span
                      key={code}
                      className="flex items-center gap-1 rounded-md bg-zinc-700 px-2 py-1 text-xs text-zinc-200"
                    >
                      {code}
                      <button
                        onClick={() => removeRef(code)}
                        className="text-zinc-400 hover:text-zinc-100"
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <input
                autoFocus
                value={refSearch}
                onChange={(e) => setRefSearch(e.target.value)}
                placeholder="Search by code or title..."
                className="w-full rounded-md bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-500"
              />

              <div className="max-h-40 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-800">
                {filteredNodes.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-zinc-500">No cards found</p>
                ) : (
                  filteredNodes.map((n) => {
                    const already = currentRefs.includes(n.data.code)
                    return (
                      <button
                        key={n.id}
                        onClick={() => { addRef(n.data.code); setRefSearch('') }}
                        disabled={already}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                          already
                            ? 'cursor-default text-zinc-600'
                            : 'text-zinc-200 hover:bg-zinc-700'
                        }`}
                      >
                        <span className="font-mono text-xs text-zinc-400">{n.data.code}</span>
                        <span className="truncate">{n.data.title}</span>
                        {already && <span className="ml-auto text-xs text-zinc-600">added</span>}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {activeField === 'slipType' && (
            <div className="flex flex-col gap-1">
              {slipTypes.map((slip) => (
                <button
                  key={slip.id}
                  onClick={() => { onUpdate(node.id, { slipTypeId: slip.id }); setActiveField(null) }}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-zinc-700 ${
                    node.data.slipTypeId === slip.id ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-300'
                  }`}
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
                  className={`rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-700 ${
                    node.data.puzzleType === pt ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-300'
                  }`}
                >
                  {pt.charAt(0).toUpperCase() + pt.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 shadow-xl">
        {BUTTONS.map(({ field, label }) => (
          <button
            key={field}
            onClick={() => toggleField(field)}
            className={`whitespace-nowrap rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
              activeField === field
                ? 'bg-zinc-600 text-zinc-100'
                : 'text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100'
            }`}
          >
            {label}
          </button>
        ))}

        <div className="mx-2 h-5 w-px bg-zinc-700" />

        <button
          onClick={(e) => { e.stopPropagation(); onDelete(node.id) }}
          className="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-950 hover:text-red-200"
        >
          Delete
        </button>

        <button
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
