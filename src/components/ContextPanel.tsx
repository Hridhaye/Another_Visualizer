import { useRef, useState } from 'react'
import { useViewport } from 'reactflow'
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

type ActiveField = 'code' | 'title' | 'summary' | 'body' | 'references' | 'slipType' | 'puzzleType' | null

const BUTTONS: { field: ActiveField; label: string }[] = [
  { field: 'code', label: 'Code' },
  { field: 'title', label: 'Title' },
  { field: 'summary', label: 'Summary' },
  { field: 'body', label: 'Narrative Body' },
  { field: 'references', label: 'Reference' },
  { field: 'slipType', label: 'Slip' },
  { field: 'puzzleType', label: 'Puzzle' }
]

export function ContextPanel({ node, allNodes, slipTypes, isLinkSource, onUpdate, onDelete, onClose, onToggleLink }: ContextPanelProps) {
  const [activeField, setActiveField] = useState<ActiveField>(null)
  const [refSearch, setRefSearch] = useState('')
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const { zoom } = useViewport()

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
  const zoomScale = Math.max(0.85, Math.min(1.7, 1 / Math.max(zoom, 0.01)))

  function applyBodyFormatting(tag: 'b' | 'i' | 'u') {
    const textarea = bodyTextareaRef.current
    if (!textarea) {
      return
    }

    const start = textarea.selectionStart ?? 0
    const end = textarea.selectionEnd ?? start
    const openTag = `<${tag}>`
    const closeTag = `</${tag}>`
    const currentBody = node.data.body
    const selectedText = currentBody.slice(start, end)
    const nextBody =
      currentBody.slice(0, start) +
      openTag +
      selectedText +
      closeTag +
      currentBody.slice(end)

    onUpdate(node.id, { body: nextBody })

    requestAnimationFrame(() => {
      textarea.focus()
      const selectionStart = start + openTag.length
      const selectionEnd = selectionStart + selectedText.length
      textarea.setSelectionRange(selectionStart, selectionEnd)
    })
  }

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        bottom: 'calc(100% + 10px)',
        left: '50%',
        transform: `translateX(-50%) scale(${zoomScale})`,
        transformOrigin: 'bottom center'
      }}
    >
      {activeField && (
        <div
          className="nodrag nowheel pointer-events-auto mb-2 w-[min(92vw,26rem)] rounded-xl border border-zinc-700 bg-zinc-950 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.8)]"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {(activeField === 'code' || activeField === 'title') && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{activeField}</label>
              <input
                autoFocus
                value={activeField === 'code' ? node.data.code : node.data.title}
                onChange={(e) => onUpdate(node.id, { [activeField]: e.target.value })}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-zinc-500"
              />
            </div>
          )}

          {activeField === 'summary' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Summary</label>
              <textarea
                autoFocus
                value={node.data.summary}
                onChange={(e) => onUpdate(node.id, { summary: e.target.value })}
                rows={4}
                className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-zinc-500"
              />
            </div>
          )}

          {activeField === 'body' && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Narrative Body</label>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => applyBodyFormatting('b')}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs font-bold text-zinc-200 hover:bg-zinc-800"
                  aria-label="Bold"
                >
                  B
                </button>
                <button
                  onClick={() => applyBodyFormatting('i')}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs italic text-zinc-200 hover:bg-zinc-800"
                  aria-label="Italic"
                >
                  I
                </button>
                <button
                  onClick={() => applyBodyFormatting('u')}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs underline text-zinc-200 hover:bg-zinc-800"
                  aria-label="Underline"
                >
                  U
                </button>
              </div>
              <textarea
                ref={bodyTextareaRef}
                autoFocus
                value={node.data.body}
                onChange={(e) => onUpdate(node.id, { body: e.target.value })}
                rows={10}
                className="w-full resize-y rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs leading-5 text-zinc-100 outline-none focus:border-zinc-500"
              />
            </div>
          )}

          {activeField === 'references' && (
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">References & Linking</label>
              <button
                onClick={(e) => { e.stopPropagation(); onToggleLink() }}
                className={`flex h-9 w-full items-center justify-center rounded-lg px-4 text-xs font-bold transition-colors ${
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
                      >x</button>
                    </span>
                  ))}
                </div>
              )}

              <input
                autoFocus
                value={refSearch}
                onChange={(e) => setRefSearch(e.target.value)}
                placeholder="Search by code or title..."
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-zinc-500"
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
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Select Slip Type</label>
              {slipTypes.map((slip) => (
                <button
                  key={slip.id}
                  onClick={() => { onUpdate(node.id, { slipTypeId: slip.id }); setActiveField(null) }}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-zinc-800 ${
                    node.data.slipTypeId === slip.id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'
                  }`}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: slip.color }} />
                  {slip.name}
                </button>
              ))}
            </div>
          )}

          {activeField === 'puzzleType' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Select Puzzle Type</label>
              {PUZZLE_TYPES.map((pt) => (
                <button
                  key={pt}
                  onClick={() => { onUpdate(node.id, { puzzleType: pt }); setActiveField(null) }}
                  className={`rounded-md px-2 py-1.5 text-left text-xs hover:bg-zinc-800 ${
                    node.data.puzzleType === pt ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'
                  }`}
                >
                  {pt.charAt(0).toUpperCase() + pt.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        className="nodrag nowheel pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-zinc-700 bg-zinc-950 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.8)]"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {BUTTONS.map(({ field, label }) => (
          <button
            key={field}
            onClick={() => toggleField(field)}
            className={`h-9 whitespace-nowrap rounded-lg px-4 text-xs font-bold uppercase tracking-wider transition-all ${
              activeField === field
                ? 'bg-zinc-100 text-zinc-950 shadow-lg'
                : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
            }`}
          >
            {label}
          </button>
        ))}

        <div className="mx-1 hidden h-5 w-px bg-zinc-800 sm:block" />

        <button
          onClick={(e) => { e.stopPropagation(); onDelete(node.id) }}
          className="h-9 whitespace-nowrap rounded-lg px-4 text-xs font-bold uppercase tracking-wider text-red-500/80 transition-all hover:bg-red-950/30 hover:text-red-400"
        >
          Delete
        </button>

        <button
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
