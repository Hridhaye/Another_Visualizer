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
  tags: 'Tags',
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
  const tags = useNarrativeBoardStore((s) => s.tags)
  const addTag = useNarrativeBoardStore((s) => s.addTag)
  const deleteTag = useNarrativeBoardStore((s) => s.deleteTag)
  const assignTagToNode = useNarrativeBoardStore((s) => s.assignTagToNode)
  const unassignTagFromNode = useNarrativeBoardStore((s) => s.unassignTagFromNode)

  const node = nodes.find((n) => n.id === selectedNodeId) ?? null
  const hasSingleSelection = selectedNodeIds.length === 1
  const [refSearch, setRefSearch] = useState('')
  const [tagSearch, setTagSearch] = useState('')
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (activeEditorField && inputRef.current) {
      inputRef.current.focus()
    }
    setRefSearch('')
    setTagSearch('')
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

  function slipIdForRef(code: string): string | undefined {
    return otherNodes.find((n) => n.data.code === code)?.data.slipTypeId
  }

  function addOneSlip(given: string[], slipId: string): string[] {
    return [...given, slipId]
  }

  function removeOneSlip(given: string[], slipId: string): string[] {
    const idx = given.indexOf(slipId)
    if (idx === -1) return given
    return [...given.slice(0, idx), ...given.slice(idx + 1)]
  }

  function addRef(code: string) {
    if (!node) return
    const next = currentRefs.includes(code) ? currentRefs : [...currentRefs, code]
    updateNode(node.id, { referencesText: next.join(', ') })
  }

  function removeRef(code: string) {
    if (!node) return
    const wasOn = slipForms.includes(code)
    const slipId = slipIdForRef(code)
    const patch: Partial<typeof node.data> = {
      referencesText: currentRefs.filter((r) => r !== code).join(', '),
      referenceSlipForms: slipForms.filter((c) => c !== code)
    }
    if (wasOn && slipId) {
      patch.slipGivenTypeIds = removeOneSlip(node.data.slipGivenTypeIds ?? [], slipId)
    }
    updateNode(node.id, patch)
  }

  function toggleSlipForm(code: string) {
    if (!node) return
    const turningOn = !slipForms.includes(code)
    const slipId = slipIdForRef(code)
    const next = turningOn
      ? [...slipForms, code]
      : slipForms.filter((c) => c !== code)
    const patch: Partial<typeof node.data> = { referenceSlipForms: next }
    if (slipId) {
      const given = node.data.slipGivenTypeIds ?? []
      patch.slipGivenTypeIds = turningOn ? addOneSlip(given, slipId) : removeOneSlip(given, slipId)
    }
    updateNode(node.id, patch)
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
          function minFor(slipId: string) {
            return autoIds.filter((id) => id === slipId).length
          }
          function adjust(slipId: string, count: number, delta: number) {
            const next = Math.max(minFor(slipId), count + delta)
            const without = given.filter((id) => id !== slipId)
            updateNode(nodeId, { slipGivenTypeIds: [...without, ...Array(next).fill(slipId)] })
          }
          function clearToMinimums() {
            const next = slipTypes.flatMap((slip) => Array(minFor(slip.id)).fill(slip.id))
            updateNode(nodeId, { slipGivenTypeIds: next })
          }
          const hasManualExtra = slipTypes.some((slip) => given.filter((id) => id === slip.id).length > minFor(slip.id))
          return (
          <div className="cef-slip-given">
            <p className="cef-slip-given__hint">Set how many of each slip type this card gives out. References with their slip form on raise the minimum.</p>
            <div className="cef-slip-given__rows">
              {slipTypes.map((slip) => {
                const count = given.filter((id) => id === slip.id).length
                const min = minFor(slip.id)
                return (
                  <div key={slip.id} className="cef-slip-given__row">
                    <span className="cef-list__dot" style={{ background: slip.color }} />
                    <span className={`cef-slip-given__name ${count > 0 ? 'cef-slip-given__name--active' : ''}`}>
                      {slip.name}
                      {min > 0 && <span className="cef-slip-given__auto" title="Minimum set by referenced cards"> min {min}</span>}
                    </span>
                    <button className="cef-slip-given__stepper" onClick={() => adjust(slip.id, count, -1)} disabled={count <= min}>−</button>
                    <span className="cef-slip-given__count">{count}</span>
                    <button className="cef-slip-given__stepper" onClick={() => adjust(slip.id, count, 1)}>+</button>
                  </div>
                )
              })}
            </div>
            {hasManualExtra && (
              <button
                className="cef-slip-given__clear"
                onClick={clearToMinimums}
              >
                Reset to minimums
              </button>
            )}
          </div>
          )
        })()}

        {activeEditorField === 'tags' && (() => {
          const assigned = node.data.tagIds ?? []
          const search = tagSearch.trim()
          const searchLower = search.toLowerCase()
          const filtered = tags.filter((t) => t.name.toLowerCase().includes(searchLower))
          const exactExists = tags.some((t) => t.name.toLowerCase() === searchLower)
          function createAndAssign() {
            if (!node || !search || exactExists) return
            addTag(search)
            const created = useNarrativeBoardStore.getState().tags.find((t) => t.name.toLowerCase() === searchLower)
            if (created) assignTagToNode(node.id, created.id)
            setTagSearch('')
          }
          return (
          <div className="cef-refs">
            {assigned.length > 0 && (
              <div className="cef-refs__chips">
                {assigned.map((tagId) => {
                  const tag = tags.find((t) => t.id === tagId)
                  if (!tag) return null
                  return (
                    <span key={tagId} className="cef-chip cef-chip--slip-form">
                      <span className="cef-chip__title">{tag.name}</span>
                      <button onClick={() => unassignTagFromNode(node.id, tagId)} className="cef-chip__remove">×</button>
                    </span>
                  )
                })}
              </div>
            )}
            <input
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createAndAssign() }}
              placeholder="Search or create a tag…"
              className="cef-input"
            />
            {search && !exactExists && (
              <button onClick={createAndAssign} className="cef-refs__item">
                <span className="cef-refs__item-title">Create “{search}”</span>
                <span className="cef-refs__item-badge">new</span>
              </button>
            )}
            <div className="cef-refs__list">
              {filtered.length === 0 && !search ? (
                <p className="cef-refs__empty">No tags yet</p>
              ) : (
                filtered.map((tag) => {
                  const already = assigned.includes(tag.id)
                  return (
                    <div key={tag.id} className="cef-tag-row">
                      <button
                        onClick={() => (already ? unassignTagFromNode(node.id, tag.id) : assignTagToNode(node.id, tag.id))}
                        className={`cef-refs__item cef-tag-assign ${already ? 'cef-refs__item--added' : ''}`}
                      >
                        <span className="cef-refs__item-title">{tag.name}</span>
                        {already && <span className="cef-refs__item-badge">added</span>}
                      </button>
                      <button onClick={() => deleteTag(tag.id)} className="cef-tag-delete" title="Delete tag from project">×</button>
                    </div>
                  )
                })
              )}
            </div>
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
            <p className="cef-slip-given__hint" style={{ marginTop: 12 }}>Puzzle Title</p>
            <input
              type="text"
              value={node.data.puzzleTitle ?? ''}
              onChange={(e) => updateNode(node.id, { puzzleTitle: e.target.value })}
              placeholder="The locked door"
              className="cef-input"
              maxLength={40}
            />
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
