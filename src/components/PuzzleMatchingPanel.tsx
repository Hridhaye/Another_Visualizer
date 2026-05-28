import { useEffect, useRef } from 'react'
import { useNarrativeBoardStore } from '../store/useNarrativeBoardStore'
import type { MatchingPuzzleContent } from '../types/narrative'

function emptyMatching(): MatchingPuzzleContent {
  return { questionHtml: '', cards: [] }
}

export function PuzzleMatchingPanel() {
  const puzzleBodyOpen = useNarrativeBoardStore((s) => s.puzzleBodyOpen)
  const closePuzzleBody = useNarrativeBoardStore((s) => s.closePuzzleBody)
  const selectedNodeId = useNarrativeBoardStore((s) => s.selectedNodeId)
  const selectedNodeIds = useNarrativeBoardStore((s) => s.selectedNodeIds)
  const nodes = useNarrativeBoardStore((s) => s.nodes)
  const updateNode = useNarrativeBoardStore((s) => s.updateNode)
  const enterMatchingPickMode = useNarrativeBoardStore((s) => s.enterMatchingPickMode)

  const node = nodes.find((n) => n.id === selectedNodeId) ?? null
  const hasSingleSelection = selectedNodeIds.length === 1
  const matching: MatchingPuzzleContent = node?.data.puzzleMatchingContent ?? emptyMatching()

  const questionRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!puzzleBodyOpen || !node) return
    const el = questionRef.current
    if (!el) return
    if (el.innerHTML !== matching.questionHtml) {
      el.innerHTML = matching.questionHtml
    }
  }, [puzzleBodyOpen, node?.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closePuzzleBody()
    }
    if (puzzleBodyOpen) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [puzzleBodyOpen, closePuzzleBody])

  if (!puzzleBodyOpen || !node || !hasSingleSelection) return null
  if (node.data.puzzleType !== 'matching') return null

  function save(patch: Partial<MatchingPuzzleContent>) {
    if (!node) return
    updateNode(node.id, { puzzleMatchingContent: { ...matching, ...patch } })
  }

  function syncQuestion() {
    const el = questionRef.current
    if (!el) return
    save({ questionHtml: el.innerHTML })
  }

  function applyFormat(command: 'bold' | 'italic' | 'underline') {
    questionRef.current?.focus()
    document.execCommand(command)
    syncQuestion()
  }

  function removeCard(nodeId: string) {
    save({ cards: matching.cards.filter((c) => c.nodeId !== nodeId) })
  }

  function toggleSolution(nodeId: string) {
    save({
      cards: matching.cards.map((c) =>
        c.nodeId === nodeId ? { ...c, isSolution: !c.isSolution } : c
      )
    })
  }

  function setRepresentativeLine(nodeId: string, value: string) {
    save({
      cards: matching.cards.map((c) =>
        c.nodeId === nodeId ? { ...c, representativeLine: value } : c
      )
    })
  }

  return (
    <div
      className="narrative-body-panel puzzle-matching-panel"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="narrative-body-panel__header">
        <div className="narrative-body-panel__meta">
          <span className="narrative-body-panel__code">{node.data.code}</span>
          <span className="narrative-body-panel__title">{node.data.title}</span>
          <span className="puzzle-fill-panel__type-badge">Matching</span>
        </div>

        <div className="narrative-body-panel__toolbar">
          <button onClick={() => applyFormat('bold')} className="narrative-body-panel__fmt-btn narrative-body-panel__fmt-btn--bold" aria-label="Bold">B</button>
          <button onClick={() => applyFormat('italic')} className="narrative-body-panel__fmt-btn narrative-body-panel__fmt-btn--italic" aria-label="Italic">I</button>
          <button onClick={() => applyFormat('underline')} className="narrative-body-panel__fmt-btn narrative-body-panel__fmt-btn--underline" aria-label="Underline">U</button>
        </div>

        <button onClick={closePuzzleBody} className="narrative-body-panel__close" aria-label="Close puzzle panel">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Question editor */}
      <div
        ref={questionRef}
        contentEditable
        suppressContentEditableWarning
        onInput={syncQuestion}
        onKeyDown={(e) => {
          const isMod = e.ctrlKey || e.metaKey
          if (!isMod) return
          const key = e.key.toLowerCase()
          if (key === 'b') { e.preventDefault(); applyFormat('bold') }
          else if (key === 'i') { e.preventDefault(); applyFormat('italic') }
          else if (key === 'u') { e.preventDefault(); applyFormat('underline') }
        }}
        className="narrative-body-panel__editor puzzle-matching-panel__question"
        data-placeholder="Question text…"
      />

      {/* Cards under consideration */}
      <div className="puzzle-matching-panel__cards-section">
        <div className="puzzle-matching-panel__section-header">
          <span className="puzzle-matching-panel__section-label">Cards under consideration</span>
          <button
            onClick={() => enterMatchingPickMode(node.id)}
            className="puzzle-matching-panel__pick-btn"
          >
            + Pick card from board
          </button>
        </div>

        {matching.cards.length === 0 && (
          <p className="puzzle-matching-panel__empty">No cards added yet. Pick cards from the board above.</p>
        )}

        <div className="puzzle-matching-panel__card-list">
          {matching.cards.map((entry) => {
            const refNode = nodes.find((n) => n.id === entry.nodeId)
            if (!refNode) return null
            return (
              <div
                key={entry.nodeId}
                className={`puzzle-matching-panel__card-row${entry.isSolution ? ' puzzle-matching-panel__card-row--solution' : ''}`}
              >
                <div className="puzzle-matching-panel__card-info">
                  <span className="puzzle-matching-panel__card-code">{refNode.data.code}</span>
                  <span className="puzzle-matching-panel__card-title">{refNode.data.title}</span>
                </div>

                <div className="puzzle-matching-panel__card-actions">
                  <button
                    onClick={() => toggleSolution(entry.nodeId)}
                    className={`puzzle-matching-panel__solution-btn${entry.isSolution ? ' puzzle-matching-panel__solution-btn--active' : ''}`}
                    title={entry.isSolution ? 'Mark as non-solution' : 'Mark as solution'}
                  >
                    {entry.isSolution ? 'Solution' : 'Mark solution'}
                  </button>
                  <button
                    onClick={() => removeCard(entry.nodeId)}
                    className="puzzle-matching-panel__remove-btn"
                    aria-label="Remove card"
                  >×</button>
                </div>

                {entry.isSolution && (
                  <textarea
                    value={entry.representativeLine}
                    onChange={(e) => setRepresentativeLine(entry.nodeId, e.target.value)}
                    placeholder="Representative line (optional)…"
                    className="puzzle-matching-panel__rep-line"
                    rows={2}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
