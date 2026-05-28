import { useState } from 'react'
import { parseReferences } from '../graph/buildEdgesFromReferences'
import { PUZZLE_TYPES, type CardData, type NarrativeNode, type SlipType } from '../types/narrative'
import { useNarrativeBoardStore } from '../store/useNarrativeBoardStore'

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

type ActiveField = 'code' | 'title' | 'summary' | 'references' | 'slipType' | 'slipGiven' | 'puzzleType' | null

const BUTTONS: { field: ActiveField | 'body'; label: string }[] = [
  { field: 'code',       label: 'Code' },
  { field: 'title',      label: 'Title' },
  { field: 'summary',    label: 'Summary' },
  { field: 'body',       label: 'Body' },
  { field: 'references', label: 'Refs' },
  { field: 'slipType',   label: 'Slip' },
  { field: 'slipGiven',  label: 'Given' },
  { field: 'puzzleType', label: 'Puzzle' },
]

export function ContextPanel({ node, allNodes, slipTypes, isLinkSource, onUpdate, onDelete, onClose, onToggleLink }: ContextPanelProps) {
  const [activeField, setActiveField] = useState<ActiveField>(null)
  const [refSearch, setRefSearch] = useState('')
  const narrativeBodyOpen = useNarrativeBoardStore((s) => s.narrativeBodyOpen)
  const openNarrativeBody = useNarrativeBoardStore((s) => s.openNarrativeBody)
  const closeNarrativeBody = useNarrativeBoardStore((s) => s.closeNarrativeBody)

  function toggleField(field: ActiveField | 'body') {
    if (field === 'body') {
      narrativeBodyOpen ? closeNarrativeBody() : openNarrativeBody()
      setActiveField(null)
      return
    }
    setActiveField((prev) => (prev === field ? null : field))
    setRefSearch('')
  }

  const currentRefs = parseReferences(node.data.referencesText)

  function addRef(code: string) {
    const next = currentRefs.includes(code) ? currentRefs : [...currentRefs, code]
    onUpdate(node.id, { referencesText: next.join(', ') })
  }

  function removeRef(code: string) {
    onUpdate(node.id, { referencesText: currentRefs.filter((r) => r !== code).join(', ') })
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
      className="nodrag nowheel context-panel"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{ position: 'absolute', bottom: '76px', left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}
    >
      {activeField && (
        <div className="context-panel__popover">
          {(activeField === 'code' || activeField === 'title') && (
            <div className="context-panel__field">
              <label className="context-panel__label">{activeField}</label>
              <input
                autoFocus
                value={activeField === 'code' ? node.data.code : node.data.title}
                onChange={(e) => onUpdate(node.id, { [activeField]: e.target.value })}
                className="context-panel__input"
              />
            </div>
          )}

          {activeField === 'summary' && (
            <div className="context-panel__field">
              <label className="context-panel__label">Summary</label>
              <textarea
                autoFocus
                value={node.data.summary}
                onChange={(e) => onUpdate(node.id, { summary: e.target.value })}
                rows={4}
                className="context-panel__input context-panel__input--textarea"
              />
            </div>
          )}

          {activeField === 'references' && (
            <div className="context-panel__field">
              <label className="context-panel__label">References</label>
              {currentRefs.length > 0 && (
                <div className="context-panel__ref-tags">
                  {currentRefs.map((code) => (
                    <span key={code} className="context-panel__ref-tag">
                      {code}
                      <button onClick={() => removeRef(code)} className="context-panel__ref-remove">×</button>
                    </span>
                  ))}
                </div>
              )}
              <input
                autoFocus
                value={refSearch}
                onChange={(e) => setRefSearch(e.target.value)}
                placeholder="Search by code or title…"
                className="context-panel__input"
              />
              <div className="context-panel__ref-list">
                {filteredNodes.length === 0 ? (
                  <p className="context-panel__ref-empty">No cards found</p>
                ) : (
                  filteredNodes.map((n) => {
                    const already = currentRefs.includes(n.data.code)
                    return (
                      <button
                        key={n.id}
                        onClick={() => { addRef(n.data.code); setRefSearch('') }}
                        disabled={already}
                        className={`context-panel__ref-item${already ? ' context-panel__ref-item--added' : ''}`}
                      >
                        <span className="context-panel__ref-code">{n.data.code}</span>
                        <span className="context-panel__ref-title">{n.data.title}</span>
                        {already && <span className="context-panel__ref-badge">added</span>}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {activeField === 'slipType' && (
            <div className="context-panel__field">
              <label className="context-panel__label">Card Slip</label>
              {slipTypes.map((slip) => (
                <button
                  key={slip.id}
                  onClick={() => { onUpdate(node.id, { slipTypeId: slip.id }); setActiveField(null) }}
                  className={`context-panel__slip-item${node.data.slipTypeId === slip.id ? ' context-panel__slip-item--active' : ''}`}
                >
                  <span className="context-panel__slip-dot" style={{ backgroundColor: slip.color }} />
                  {slip.name}
                </button>
              ))}
            </div>
          )}

          {activeField === 'slipGiven' && (() => {
            const given = node.data.slipGivenTypeIds ?? []
            const counts = slipTypes.map((slip) => ({
              slip,
              count: given.filter((id) => id === slip.id).length
            }))
            function setCount(slipId: string, delta: number) {
              const current = given.filter((id) => id === slipId).length
              const next = Math.max(0, current + delta)
              const without = given.filter((id) => id !== slipId)
              onUpdate(node.id, { slipGivenTypeIds: [...without, ...Array(next).fill(slipId)] })
            }
            return (
              <div className="context-panel__field">
                <label className="context-panel__label">Slip Given</label>
                {counts.map(({ slip, count }) => (
                  <div key={slip.id} className="context-panel__slip-given-row">
                    <span className="context-panel__slip-dot" style={{ backgroundColor: slip.color }} />
                    <span className={`context-panel__slip-name${count > 0 ? ' context-panel__slip-name--active' : ''}`}>{slip.name}</span>
                    <button onClick={() => setCount(slip.id, -1)} disabled={count === 0} className="context-panel__stepper">−</button>
                    <span className="context-panel__stepper-val">{count}</span>
                    <button onClick={() => setCount(slip.id, 1)} className="context-panel__stepper">+</button>
                  </div>
                ))}
              </div>
            )
          })()}

          {activeField === 'puzzleType' && (
            <div className="context-panel__field">
              <label className="context-panel__label">Puzzle Type</label>
              {PUZZLE_TYPES.map((pt) => (
                <button
                  key={pt}
                  onClick={() => { onUpdate(node.id, { puzzleType: pt }); setActiveField(null) }}
                  className={`context-panel__slip-item${node.data.puzzleType === pt ? ' context-panel__slip-item--active' : ''}`}
                >
                  {pt.charAt(0).toUpperCase() + pt.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="context-panel__bar">
        <div className="context-panel__identity">
          <span className="context-panel__identity-code">{node.data.code}</span>
          <span className="context-panel__identity-title">{node.data.title}</span>
        </div>

        {BUTTONS.map(({ field, label }) => (
          <button
            key={field}
            onClick={() => toggleField(field)}
            className={`history-bar__btn${(field === 'body' ? narrativeBodyOpen : activeField === field) ? ' context-panel__btn--active' : ''}`}
          >
            {label}
          </button>
        ))}

        <div className="history-bar__divider" />

        <button
          onClick={(e) => { e.stopPropagation(); onToggleLink() }}
          className={`history-bar__btn${isLinkSource ? ' context-panel__btn--link-active' : ''}`}
        >
          {isLinkSource ? 'Cancel' : 'Link'}
        </button>

        <div className="history-bar__divider" />

        <button
          onClick={(e) => { e.stopPropagation(); onDelete(node.id) }}
          className="history-bar__btn history-bar__btn--danger"
        >
          Delete
        </button>

        <button onClick={onClose} className="context-panel__close">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
