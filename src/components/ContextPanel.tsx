import { useState } from 'react'
import { autoGivenSlipIds, parseReferences } from '../graph/buildEdgesFromReferences'
import { PUZZLE_TYPES, type CardData, type NarrativeNode, type SlipType } from '../types/narrative'
import { useNarrativeBoardStore } from '../store/useNarrativeBoardStore'

type ContextPanelProps = {
  node: NarrativeNode
  allNodes: NarrativeNode[]
  slipTypes: SlipType[]
  isLinkSource: boolean
  onUpdate: (nodeId: string, patch: Partial<CardData>) => void
  onClose: () => void
  onToggleLink: () => void
}

type ActiveField = 'codeRefs' | 'title' | 'summary' | 'slipType' | 'slipGiven' | 'tags' | 'puzzleType' | null

const BUTTONS: { field: ActiveField | 'body'; label: string }[] = [
  { field: 'codeRefs',   label: 'Code & Refs' },
  { field: 'title',      label: 'Title' },
  { field: 'summary',    label: 'Summary' },
  { field: 'body',       label: 'Body' },
  { field: 'slipType',   label: 'Card Slip' },
  { field: 'slipGiven',  label: 'Given Slip' },
  { field: 'tags',       label: 'Tags' },
  { field: 'puzzleType', label: 'Puzzle' },
]

export function ContextPanel({ node, allNodes, slipTypes, isLinkSource, onUpdate, onClose, onToggleLink }: ContextPanelProps) {
  const [activeField, setActiveField] = useState<ActiveField>(null)
  const [refSearch, setRefSearch] = useState('')
  const [tagSearch, setTagSearch] = useState('')
  const tags = useNarrativeBoardStore((s) => s.tags)
  const addTag = useNarrativeBoardStore((s) => s.addTag)
  const deleteTag = useNarrativeBoardStore((s) => s.deleteTag)
  const assignTagToNode = useNarrativeBoardStore((s) => s.assignTagToNode)
  const unassignTagFromNode = useNarrativeBoardStore((s) => s.unassignTagFromNode)
  const narrativeBodyOpen = useNarrativeBoardStore((s) => s.narrativeBodyOpen)
  const openNarrativeBody = useNarrativeBoardStore((s) => s.openNarrativeBody)
  const closeNarrativeBody = useNarrativeBoardStore((s) => s.closeNarrativeBody)
  const puzzleBodyOpen = useNarrativeBoardStore((s) => s.puzzleBodyOpen)
  const openPuzzleBody = useNarrativeBoardStore((s) => s.openPuzzleBody)
  const closePuzzleBody = useNarrativeBoardStore((s) => s.closePuzzleBody)

  function toggleField(field: ActiveField | 'body') {
    if (field === 'body') {
      narrativeBodyOpen ? closeNarrativeBody() : openNarrativeBody()
      setActiveField(null)
      return
    }
    setActiveField((prev) => (prev === field ? null : field))
    setRefSearch('')
    setTagSearch('')
  }

  const currentRefs = parseReferences(node.data.referencesText)
  const slipForms = node.data.referenceSlipForms ?? []

  function slipIdForRef(code: string): string | undefined {
    return allNodes.find((n) => n.id !== node.id && n.data.code === code)?.data.slipTypeId
  }

  function removeOneSlip(given: string[], slipId: string): string[] {
    const idx = given.indexOf(slipId)
    if (idx === -1) return given
    return [...given.slice(0, idx), ...given.slice(idx + 1)]
  }

  function addRef(code: string) {
    const next = currentRefs.includes(code) ? currentRefs : [...currentRefs, code]
    onUpdate(node.id, { referencesText: next.join(', ') })
  }

  function removeRef(code: string) {
    const wasOn = slipForms.includes(code)
    const slipId = slipIdForRef(code)
    const patch: Partial<CardData> = {
      referencesText: currentRefs.filter((r) => r !== code).join(', '),
      referenceSlipForms: slipForms.filter((c) => c !== code)
    }
    if (wasOn && slipId) {
      patch.slipGivenTypeIds = removeOneSlip(node.data.slipGivenTypeIds ?? [], slipId)
    }
    onUpdate(node.id, patch)
  }

  function toggleSlipForm(code: string) {
    const turningOn = !slipForms.includes(code)
    const slipId = slipIdForRef(code)
    const next = turningOn
      ? [...slipForms, code]
      : slipForms.filter((c) => c !== code)
    const patch: Partial<CardData> = { referenceSlipForms: next }
    if (slipId) {
      const given = node.data.slipGivenTypeIds ?? []
      patch.slipGivenTypeIds = turningOn ? [...given, slipId] : removeOneSlip(given, slipId)
    }
    onUpdate(node.id, patch)
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
          {activeField === 'title' && (
            <div className="context-panel__field">
              <label className="context-panel__label">Title</label>
              <input
                autoFocus
                value={node.data.title}
                onChange={(e) => onUpdate(node.id, { title: e.target.value })}
                className="context-panel__input"
              />
            </div>
          )}

          {activeField === 'codeRefs' && (
            <div className="context-panel__field">
              <label className="context-panel__label">This card's code</label>
              <input
                autoFocus
                value={node.data.code}
                onChange={(e) => onUpdate(node.id, { code: e.target.value })}
                className="context-panel__input"
              />
              <label className="context-panel__label" style={{ marginTop: 12 }}>References</label>
              {currentRefs.length > 0 && (
                <div className="context-panel__ref-tags">
                  {currentRefs.map((code) => {
                    const target = otherNodes.find((n) => n.data.code === code)
                    const slipForm = slipForms.includes(code)
                    const targetSlip = target ? slipTypes.find((s) => s.id === target.data.slipTypeId) : undefined
                    return (
                      <span key={code} className={`context-panel__ref-tag${slipForm ? ' context-panel__ref-tag--slip-form' : ''}`}>
                        <span className="context-panel__ref-tag-title">{target?.data.title || code}</span>
                        <span className="context-panel__ref-tag-code">{code}</span>
                        <button
                          onClick={() => toggleSlipForm(code)}
                          className={`context-panel__ref-slip-toggle${slipForm ? ' context-panel__ref-slip-toggle--on' : ''}`}
                          title={slipForm
                            ? `Gives ${targetSlip?.name ?? 'its'} slip — click to stop`
                            : `Also give this card's slip type${targetSlip ? ` (${targetSlip.name})` : ''}`}
                        >
                          {targetSlip && <span className="context-panel__slip-dot" style={{ backgroundColor: targetSlip.color }} />}
                          {slipForm ? 'slip ✓' : 'slip'}
                        </button>
                        <button onClick={() => removeRef(code)} className="context-panel__ref-remove">×</button>
                      </span>
                    )
                  })}
                </div>
              )}
              <input
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
            const autoIds = autoGivenSlipIds(node, allNodes)
            const counts = slipTypes.map((slip) => ({
              slip,
              count: given.filter((id) => id === slip.id).length,
              min: autoIds.filter((id) => id === slip.id).length
            }))
            function setCount(slipId: string, min: number, delta: number) {
              const current = given.filter((id) => id === slipId).length
              const next = Math.max(min, current + delta)
              const without = given.filter((id) => id !== slipId)
              onUpdate(node.id, { slipGivenTypeIds: [...without, ...Array(next).fill(slipId)] })
            }
            return (
              <div className="context-panel__field">
                <label className="context-panel__label">Slip Given</label>
                {counts.map(({ slip, count, min }) => (
                  <div key={slip.id} className="context-panel__slip-given-row">
                    <span className="context-panel__slip-dot" style={{ backgroundColor: slip.color }} />
                    <span className={`context-panel__slip-name${count > 0 ? ' context-panel__slip-name--active' : ''}`}>
                      {slip.name}
                      {min > 0 && <span className="context-panel__slip-auto" title="Minimum set by referenced cards"> min {min}</span>}
                    </span>
                    <button onClick={() => setCount(slip.id, min, -1)} disabled={count <= min} className="context-panel__stepper">−</button>
                    <span className="context-panel__stepper-val">{count}</span>
                    <button onClick={() => setCount(slip.id, min, 1)} className="context-panel__stepper">+</button>
                  </div>
                ))}
              </div>
            )
          })()}

          {activeField === 'tags' && (() => {
            const assigned = node.data.tagIds ?? []
            const search = tagSearch.trim()
            const searchLower = search.toLowerCase()
            const filtered = tags.filter((t) => t.name.toLowerCase().includes(searchLower))
            const exactExists = tags.some((t) => t.name.toLowerCase() === searchLower)
            function createAndAssign() {
              if (!search || exactExists) return
              addTag(search)
              const created = useNarrativeBoardStore.getState().tags.find((t) => t.name.toLowerCase() === searchLower)
              if (created) assignTagToNode(node.id, created.id)
              setTagSearch('')
            }
            return (
              <div className="context-panel__field">
                <label className="context-panel__label">Tags</label>
                {assigned.length > 0 && (
                  <div className="context-panel__ref-tags">
                    {assigned.map((tagId) => {
                      const tag = tags.find((t) => t.id === tagId)
                      if (!tag) return null
                      return (
                        <span key={tagId} className="context-panel__ref-tag context-panel__ref-tag--slip-form">
                          <span className="context-panel__ref-tag-title">{tag.name}</span>
                          <button onClick={() => unassignTagFromNode(node.id, tagId)} className="context-panel__ref-remove">×</button>
                        </span>
                      )
                    })}
                  </div>
                )}
                <input
                  autoFocus
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') createAndAssign() }}
                  placeholder="Search or create a tag…"
                  className="context-panel__input"
                />
                {search && !exactExists && (
                  <button onClick={createAndAssign} className="context-panel__ref-item">
                    <span className="context-panel__ref-title">Create “{search}”</span>
                    <span className="context-panel__ref-badge">new</span>
                  </button>
                )}
                <div className="context-panel__ref-list">
                  {filtered.length === 0 && !search ? (
                    <p className="context-panel__ref-empty">No tags yet</p>
                  ) : (
                    filtered.map((tag) => {
                      const already = assigned.includes(tag.id)
                      return (
                        <div key={tag.id} className="context-panel__tag-row">
                          <button
                            onClick={() => (already ? unassignTagFromNode(node.id, tag.id) : assignTagToNode(node.id, tag.id))}
                            className={`context-panel__ref-item context-panel__tag-assign${already ? ' context-panel__ref-item--added' : ''}`}
                          >
                            <span className="context-panel__ref-title">{tag.name}</span>
                            {already && <span className="context-panel__ref-badge">added</span>}
                          </button>
                          <button
                            onClick={() => deleteTag(tag.id)}
                            className="context-panel__tag-delete"
                            title="Delete tag from project"
                          >
                            ×
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })()}

          {activeField === 'puzzleType' && (
            <div className="context-panel__field">
              <label className="context-panel__label">Puzzle Type</label>
              {PUZZLE_TYPES.map((pt) => (
                <button
                  key={pt}
                  onClick={() => {
                    onUpdate(node.id, { puzzleType: pt, puzzleSummary: pt === 'none' ? '' : node.data.puzzleSummary ?? '' })
                  }}
                  className={`context-panel__slip-item${node.data.puzzleType === pt ? ' context-panel__slip-item--active' : ''}`}
                >
                  {pt.charAt(0).toUpperCase() + pt.slice(1)}
                </button>
              ))}
              <label className="context-panel__label" style={{ marginTop: 12 }}>Puzzle Summary</label>
              <textarea
                value={node.data.puzzleSummary ?? ''}
                onChange={(e) => onUpdate(node.id, { puzzleSummary: e.target.value })}
                rows={3}
                placeholder="Who left the door closed that night?"
                className="context-panel__input context-panel__input--textarea"
              />
              {node.data.puzzleType !== 'none' && (
                <button
                  onClick={() => { puzzleBodyOpen ? closePuzzleBody() : openPuzzleBody() }}
                  className={`context-panel__slip-item${puzzleBodyOpen ? ' context-panel__slip-item--active' : ''}`}
                  style={{ marginTop: 12 }}
                >
                  {puzzleBodyOpen ? 'Close puzzle panel' : 'Open puzzle panel'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="context-panel__bar">
        <div className="context-panel__identity">
          <span className="context-panel__identity-code">{node.data.code}</span>
          <span className="context-panel__identity-title">{node.data.title}</span>
        </div>

        {BUTTONS.map(({ field, label }) => {
          const isActive = field === 'body' ? narrativeBodyOpen : activeField === field
          return (
            <button
              key={field}
              onClick={() => toggleField(field)}
              className={`history-bar__btn${isActive ? ' context-panel__btn--active' : ''}`}
            >
              {label}
            </button>
          )
        })}

        <div className="history-bar__divider" />

        <button
          onClick={(e) => { e.stopPropagation(); onToggleLink() }}
          className={`history-bar__btn${isLinkSource ? ' context-panel__btn--link-active' : ''}`}
        >
          {isLinkSource ? 'Cancel' : 'Link'}
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
