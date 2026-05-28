import { useEffect, useRef } from 'react'
import { useNarrativeBoardStore, type EditorField } from '../store/useNarrativeBoardStore'
import { PUZZLE_TYPES } from '../types/narrative'
import { autoGivenSlipIds, parseReferences } from '../graph/buildEdgesFromReferences'
import { useState } from 'react'

const FIELD_LABELS: Record<NonNullable<EditorField>, string> = {
  codeRefs: 'Code & References',
  title: 'Title',
  summary: 'Summary',
  slipType: 'Card Slip',
  slipGiven: 'Slip Given',
  puzzleType: 'Puzzle Type'
}

export function CardEditorFlyout() {
  const activeEditorField = useNarrativeBoardStore((s) => s.activeEditorField)
  const closeEditorField = useNarrativeBoardStore((s) => s.closeEditorField)
  const selectedNodeId = useNarrativeBoardStore((s) => s.selectedNodeId)
  const selectedNodeIds = useNarrativeBoardStore((s) => s.selectedNodeIds)
  const nodes = useNarrativeBoardStore((s) => s.nodes)
  const updateNode = useNarrativeBoardStore((s) => s.updateNode)
  const slipTypes = useNarrativeBoardStore((s) => s.slipTypes)

  const node = nodes.find((n) => n.id === selectedNodeId) ?? null
  const hasSingleSelection = selectedNodeIds.length === 1
  const [refSearch, setRefSearch] = useState('')
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (activeEditorField && inputRef.current) {
      inputRef.current.focus()
    }
    setRefSearch('')
  }, [activeEditorField, selectedNodeId])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeEditorField()
    }
    if (activeEditorField) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeEditorField, closeEditorField])

  if (!activeEditorField || !node || !hasSingleSelection) return null

  const currentRefs = parseReferences(node.data.referencesText)
  const searchLower = refSearch.toLowerCase()
  const otherNodes = nodes.filter((n) => n.id !== node.id)
  const filteredNodes = otherNodes.filter(
    (n) =>
      n.data.code.toLowerCase().includes(searchLower) ||
      n.data.title.toLowerCase().includes(searchLower)
  )

  const slipForms = node.data.referenceSlipForms ?? []

  function addRef(code: string) {
    if (!node) return
    const next = currentRefs.includes(code) ? currentRefs : [...currentRefs, code]
    updateNode(node.id, { referencesText: next.join(', ') })
  }

  function removeRef(code: string) {
    if (!node) return
    updateNode(node.id, {
      referencesText: currentRefs.filter((r) => r !== code).join(', '),
      referenceSlipForms: slipForms.filter((c) => c !== code)
    })
  }

  function toggleSlipForm(code: string) {
    if (!node) return
    const next = slipForms.includes(code)
      ? slipForms.filter((c) => c !== code)
      : [...slipForms, code]
    updateNode(node.id, { referenceSlipForms: next })
  }

  return (
    <div className="card-editor-flyout" onClick={(e) => e.stopPropagation()}>
      <div className="card-editor-flyout__header">
        <span className="card-editor-flyout__label">{FIELD_LABELS[activeEditorField]}</span>
        <div className="card-editor-flyout__node-id">
          <span className="card-editor-flyout__code">{node.data.code}</span>
          <span className="card-editor-flyout__title-hint">{node.data.title}</span>
        </div>
        <button
          onClick={closeEditorField}
          className="card-editor-flyout__close"
          aria-label="Close editor"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="card-editor-flyout__body">
        {activeEditorField === 'title' && (
          <input
            ref={inputRef as React.Ref<HTMLInputElement>}
            value={node.data.title}
            onChange={(e) => updateNode(node.id, { title: e.target.value })}
            className="cef-input"
            spellCheck={false}
          />
        )}

        {activeEditorField === 'codeRefs' && (
          <div className="cef-refs">
            <p className="cef-slip-given__hint">This card's code</p>
            <input
              ref={inputRef as React.Ref<HTMLInputElement>}
              value={node.data.code}
              onChange={(e) => updateNode(node.id, { code: e.target.value })}
              className="cef-input"
              spellCheck={false}
            />

            <p className="cef-slip-given__hint" style={{ marginTop: 16 }}>References to other cards</p>
            {currentRefs.length > 0 && (
              <div className="cef-refs__chips">
                {currentRefs.map((code) => {
                  const target = otherNodes.find((n) => n.data.code === code)
                  const slipForm = slipForms.includes(code)
                  const targetSlip = target ? slipTypes.find((s) => s.id === target.data.slipTypeId) : undefined
                  return (
                    <span key={code} className={`cef-chip ${slipForm ? 'cef-chip--slip-form' : ''}`}>
                      <span className="cef-chip__title">{target?.data.title || code}</span>
                      <span className="cef-chip__code">{code}</span>
                      <button
                        onClick={() => toggleSlipForm(code)}
                        className={`cef-chip__slip-toggle ${slipForm ? 'cef-chip__slip-toggle--on' : ''}`}
                        title={slipForm
                          ? `Gives ${targetSlip?.name ?? 'its'} slip — click to stop`
                          : `Also give this card's slip type${targetSlip ? ` (${targetSlip.name})` : ''}`}
                      >
                        {targetSlip && (
                          <span className="cef-list__dot" style={{ background: targetSlip.color }} />
                        )}
                        {slipForm ? 'slip ✓' : 'slip'}
                      </button>
                      <button onClick={() => removeRef(code)} className="cef-chip__remove">×</button>
                    </span>
                  )
                })}
              </div>
            )}
            <input
              value={refSearch}
              onChange={(e) => setRefSearch(e.target.value)}
              placeholder="Search by code or title…"
              className="cef-input"
            />
            <div className="cef-refs__list">
              {filteredNodes.length === 0 ? (
                <p className="cef-refs__empty">No other cards</p>
              ) : (
                filteredNodes.map((n) => {
                  const already = currentRefs.includes(n.data.code)
                  return (
                    <button
                      key={n.id}
                      onClick={() => { addRef(n.data.code); setRefSearch('') }}
                      disabled={already}
                      className={`cef-refs__item ${already ? 'cef-refs__item--added' : ''}`}
                    >
                      <span className="cef-refs__item-code">{n.data.code}</span>
                      <span className="cef-refs__item-title">{n.data.title}</span>
                      {already && <span className="cef-refs__item-badge">added</span>}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}

        {activeEditorField === 'summary' && (
          <textarea
            ref={inputRef as React.Ref<HTMLTextAreaElement>}
            value={node.data.summary}
            onChange={(e) => updateNode(node.id, { summary: e.target.value })}
            className="cef-textarea"
            rows={5}
          />
        )}

        {activeEditorField === 'slipType' && (
          <div className="cef-list">
            {slipTypes.map((slip) => (
              <button
                key={slip.id}
                onClick={() => { updateNode(node.id, { slipTypeId: slip.id }); closeEditorField() }}
                className={`cef-list__item ${node.data.slipTypeId === slip.id ? 'cef-list__item--active' : ''}`}
              >
                <span className="cef-list__dot" style={{ background: slip.color }} />
                {slip.name}
                {node.data.slipTypeId === slip.id && <span className="cef-list__check">✓</span>}
              </button>
            ))}
          </div>
        )}

        {activeEditorField === 'slipGiven' && (() => {
          const nodeId = node.id
          const given = node.data.slipGivenTypeIds ?? []
          const autoIds = autoGivenSlipIds(node, nodes)
          function adjust(slipId: string, count: number, delta: number) {
            const next = Math.max(0, count + delta)
            const without = given.filter((id) => id !== slipId)
            updateNode(nodeId, { slipGivenTypeIds: [...without, ...Array(next).fill(slipId)] })
          }
          return (
          <div className="cef-slip-given">
            <p className="cef-slip-given__hint">Set how many of each slip type this card gives out. Slips from referenced cards (slip form on) are added automatically.</p>
            <div className="cef-slip-given__rows">
              {slipTypes.map((slip) => {
                const count = given.filter((id) => id === slip.id).length
                const auto = autoIds.filter((id) => id === slip.id).length
                return (
                  <div key={slip.id} className="cef-slip-given__row">
                    <span className="cef-list__dot" style={{ background: slip.color }} />
                    <span className={`cef-slip-given__name ${count + auto > 0 ? 'cef-slip-given__name--active' : ''}`}>
                      {slip.name}
                      {auto > 0 && <span className="cef-slip-given__auto" title="From referenced cards"> +{auto} ref</span>}
                    </span>
                    <button className="cef-slip-given__stepper" onClick={() => adjust(slip.id, count, -1)} disabled={count === 0}>−</button>
                    <span className="cef-slip-given__count">{count}</span>
                    <button className="cef-slip-given__stepper" onClick={() => adjust(slip.id, count, 1)}>+</button>
                  </div>
                )
              })}
            </div>
            {given.length > 0 && (
              <button
                className="cef-slip-given__clear"
                onClick={() => updateNode(nodeId, { slipGivenTypeIds: [] })}
              >
                Clear all
              </button>
            )}
          </div>
          )
        })()}

        {activeEditorField === 'puzzleType' && (
          <div className="cef-list">
            {PUZZLE_TYPES.map((pt) => (
              <button
                key={pt}
                onClick={() => {
                  updateNode(node.id, { puzzleType: pt, puzzleSummary: pt === 'none' ? '' : node.data.puzzleSummary ?? '' })
                }}
                className={`cef-list__item ${node.data.puzzleType === pt ? 'cef-list__item--active' : ''}`}
              >
                {pt.charAt(0).toUpperCase() + pt.slice(1)}
                {node.data.puzzleType === pt && <span className="cef-list__check">✓</span>}
              </button>
            ))}
            <p className="cef-slip-given__hint" style={{ marginTop: 12 }}>Puzzle Summary</p>
            <textarea
              ref={inputRef as React.Ref<HTMLTextAreaElement>}
              value={node.data.puzzleSummary ?? ''}
              onChange={(e) => updateNode(node.id, { puzzleSummary: e.target.value })}
              rows={3}
              placeholder="Who left the door closed that night?"
              className="cef-textarea"
            />
          </div>
        )}
      </div>
    </div>
  )
}
