import { useEffect, useRef, useState } from 'react'
import { useNarrativeBoardStore } from '../store/useNarrativeBoardStore'
import type { FillBlank, FillPuzzleContent, FillWordBankEntry } from '../types/narrative'

const BLANK_TAG = 'span'
const BLANK_ATTR = 'data-blank-id'
const BLANK_CLASS = 'puzzle-fill-blank'

function makeBlankHtml(id: string): string {
  return `<${BLANK_TAG} ${BLANK_ATTR}="${id}" class="${BLANK_CLASS}" contenteditable="false"> </${BLANK_TAG}>`
}

function emptyFill(): FillPuzzleContent {
  return { bodyHtml: '', blanks: [], wordBank: [], showAnswers: false }
}

export function PuzzleFillPanel() {
  const puzzleBodyOpen = useNarrativeBoardStore((s) => s.puzzleBodyOpen)
  const closePuzzleBody = useNarrativeBoardStore((s) => s.closePuzzleBody)
  const selectedNodeId = useNarrativeBoardStore((s) => s.selectedNodeId)
  const selectedNodeIds = useNarrativeBoardStore((s) => s.selectedNodeIds)
  const nodes = useNarrativeBoardStore((s) => s.nodes)
  const updateNode = useNarrativeBoardStore((s) => s.updateNode)

  const node = nodes.find((n) => n.id === selectedNodeId) ?? null
  const hasSingleSelection = selectedNodeIds.length === 1

  const fill: FillPuzzleContent = node?.data.puzzleFillContent ?? emptyFill()

  const editorRef = useRef<HTMLDivElement | null>(null)
  // tracks which blank is selected for word assignment
  const [selectedBlankId, setSelectedBlankId] = useState<string | null>(null)
  const [newWord, setNewWord] = useState('')

  // Sync editor HTML when panel opens or node changes
  useEffect(() => {
    if (!puzzleBodyOpen || !node) return
    const editor = editorRef.current
    if (!editor) return
    const rendered = buildRenderedHtml(fill)
    if (editor.innerHTML !== rendered) {
      editor.innerHTML = rendered
    }
  }, [puzzleBodyOpen, node?.id])

  // Keep fill blanks in sync whenever showAnswers changes (re-render the editor)
  useEffect(() => {
    if (!puzzleBodyOpen || !node) return
    const editor = editorRef.current
    if (!editor) return
    editor.innerHTML = buildRenderedHtml(fill)
  }, [fill.showAnswers])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closePuzzleBody()
    }
    if (puzzleBodyOpen) window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [puzzleBodyOpen, closePuzzleBody])

  if (!puzzleBodyOpen || !node || !hasSingleSelection) return null
  if (node.data.puzzleType !== 'fill') return null

  function buildRenderedHtml(f: FillPuzzleContent): string {
    if (!f.showAnswers) return f.bodyHtml
    // Replace each blank span with the assigned word (or keep blank)
    const container = document.createElement('div')
    container.innerHTML = f.bodyHtml
    container.querySelectorAll<HTMLElement>(`[${BLANK_ATTR}]`).forEach((el) => {
      const id = el.getAttribute(BLANK_ATTR)!
      const blank = f.blanks.find((b) => b.id === id)
      const word = blank?.assignedWord ?? ''
      el.textContent = word || '    '
    })
    return container.innerHTML
  }

  function syncBodyHtml() {
    const editor = editorRef.current
    if (!editor || !node) return
    // Only save in "blank" mode — in showAnswers mode the HTML is derived, not authoritative
    if (fill.showAnswers) return
    const nextHtml = editor.innerHTML
    // Reconcile blanks: find all blank spans in the current DOM
    const presentIds = new Set<string>()
    editor.querySelectorAll<HTMLElement>(`[${BLANK_ATTR}]`).forEach((el) => {
      presentIds.add(el.getAttribute(BLANK_ATTR)!)
    })
    const nextBlanks: FillBlank[] = fill.blanks.filter((b) => presentIds.has(b.id))
    // Add any newly present ids (shouldn't happen but defensive)
    presentIds.forEach((id) => {
      if (!nextBlanks.find((b) => b.id === id)) {
        nextBlanks.push({ id, assignedWord: null })
      }
    })
    updateNode(node.id, {
      puzzleFillContent: { ...fill, bodyHtml: nextHtml, blanks: nextBlanks }
    })
  }

  function applyFormat(command: 'bold' | 'italic' | 'underline') {
    editorRef.current?.focus()
    document.execCommand(command)
    syncBodyHtml()
  }

  function insertBlank() {
    const editor = editorRef.current
    if (!editor || !node) return
    if (fill.showAnswers) return
    editor.focus()
    const id = crypto.randomUUID()
    document.execCommand('insertHTML', false, makeBlankHtml(id))
    const newBlanks: FillBlank[] = [...fill.blanks, { id, assignedWord: null }]
    updateNode(node.id, {
      puzzleFillContent: { ...fill, bodyHtml: editor.innerHTML, blanks: newBlanks }
    })
  }

  function addWord() {
    const trimmed = newWord.trim()
    if (!trimmed || !node) return
    const entry: FillWordBankEntry = { id: crypto.randomUUID(), word: trimmed }
    updateNode(node.id, {
      puzzleFillContent: { ...fill, wordBank: [...fill.wordBank, entry] }
    })
    setNewWord('')
  }

  function removeWord(wordId: string) {
    if (!node) return
    const nextBank = fill.wordBank.filter((w) => w.id !== wordId)
    // Unassign from any blank using this word
    const removedWord = fill.wordBank.find((w) => w.id === wordId)?.word ?? null
    const nextBlanks = fill.blanks.map((b) =>
      b.assignedWord === removedWord ? { ...b, assignedWord: null } : b
    )
    updateNode(node.id, {
      puzzleFillContent: { ...fill, wordBank: nextBank, blanks: nextBlanks }
    })
  }

  function assignWord(wordId: string) {
    if (!node || !selectedBlankId) return
    const word = fill.wordBank.find((w) => w.id === wordId)?.word ?? null
    const nextBlanks = fill.blanks.map((b) =>
      b.id === selectedBlankId ? { ...b, assignedWord: word } : b
    )
    updateNode(node.id, {
      puzzleFillContent: { ...fill, blanks: nextBlanks }
    })
    setSelectedBlankId(null)
  }

  function unassignBlank(blankId: string) {
    if (!node) return
    const nextBlanks = fill.blanks.map((b) =>
      b.id === blankId ? { ...b, assignedWord: null } : b
    )
    updateNode(node.id, {
      puzzleFillContent: { ...fill, blanks: nextBlanks }
    })
  }

  function toggleShowAnswers() {
    if (!node) return
    const editor = editorRef.current
    // Before toggling, save current edit state if we're in blank mode
    if (!fill.showAnswers && editor) {
      const nextHtml = editor.innerHTML
      updateNode(node.id, {
        puzzleFillContent: { ...fill, bodyHtml: nextHtml, showAnswers: true }
      })
    } else {
      updateNode(node.id, {
        puzzleFillContent: { ...fill, showAnswers: false }
      })
    }
  }

  return (
    <div
      className="narrative-body-panel puzzle-fill-panel"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="narrative-body-panel__header">
        <div className="narrative-body-panel__meta">
          <span className="narrative-body-panel__code">{node.data.code}</span>
          <span className="narrative-body-panel__title">{node.data.title}</span>
          <span className="puzzle-fill-panel__type-badge">Fill</span>
        </div>

        <div className="narrative-body-panel__toolbar">
          <button
            onClick={() => applyFormat('bold')}
            className="narrative-body-panel__fmt-btn narrative-body-panel__fmt-btn--bold"
            aria-label="Bold"
            disabled={fill.showAnswers}
          >B</button>
          <button
            onClick={() => applyFormat('italic')}
            className="narrative-body-panel__fmt-btn narrative-body-panel__fmt-btn--italic"
            aria-label="Italic"
            disabled={fill.showAnswers}
          >I</button>
          <button
            onClick={() => applyFormat('underline')}
            className="narrative-body-panel__fmt-btn narrative-body-panel__fmt-btn--underline"
            aria-label="Underline"
            disabled={fill.showAnswers}
          >U</button>
          <div className="puzzle-fill-panel__toolbar-divider" />
          <button
            onClick={insertBlank}
            className="puzzle-fill-panel__blank-btn"
            aria-label="Insert blank"
            title="Insert blank (Ctrl+Shift+B)"
            disabled={fill.showAnswers}
          >[ _ ]</button>
          <div className="puzzle-fill-panel__toolbar-divider" />
          <button
            onClick={toggleShowAnswers}
            className={`puzzle-fill-panel__toggle-btn${fill.showAnswers ? ' puzzle-fill-panel__toggle-btn--active' : ''}`}
            aria-label="Toggle answers"
          >{fill.showAnswers ? 'Hide answers' : 'Show answers'}</button>
        </div>

        <button
          onClick={closePuzzleBody}
          className="narrative-body-panel__close"
          aria-label="Close puzzle panel"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Body text editor */}
      <div
        ref={editorRef}
        contentEditable={!fill.showAnswers}
        suppressContentEditableWarning
        onInput={syncBodyHtml}
        onKeyDown={(e) => {
          const isMod = e.ctrlKey || e.metaKey
          if (!isMod) return
          const key = e.key.toLowerCase()
          if (key === 'b') { e.preventDefault(); applyFormat('bold') }
          else if (key === 'i') { e.preventDefault(); applyFormat('italic') }
          else if (key === 'u') { e.preventDefault(); applyFormat('underline') }
          else if (key === 'shift' || (e.shiftKey && key === 'b')) {
            // Ctrl+Shift+B = insert blank
          }
        }}
        onKeyUp={(e) => {
          const isMod = e.ctrlKey || e.metaKey
          if (isMod && e.shiftKey && e.key.toLowerCase() === 'b') {
            e.preventDefault()
            insertBlank()
          }
        }}
        onClick={(e) => {
          // Click on a blank to select it
          const target = e.target as HTMLElement
          if (target.hasAttribute?.(BLANK_ATTR)) {
            const id = target.getAttribute(BLANK_ATTR)!
            setSelectedBlankId((prev) => prev === id ? null : id)
          }
        }}
        className={`narrative-body-panel__editor puzzle-fill-panel__editor${fill.showAnswers ? ' puzzle-fill-panel__editor--readonly' : ''}`}
      />

      {/* Word bank section */}
      <div className="puzzle-fill-panel__word-bank-section">
        <div className="puzzle-fill-panel__word-bank-header">
          <span className="puzzle-fill-panel__word-bank-title">Word Bank</span>
          {selectedBlankId && (
            <span className="puzzle-fill-panel__blank-hint">
              Select a word to assign to blank {fill.blanks.findIndex((b) => b.id === selectedBlankId) + 1}
            </span>
          )}
        </div>

        {/* Blanks assignment list */}
        {fill.blanks.length > 0 && (
          <div className="puzzle-fill-panel__blanks-list">
            {fill.blanks.map((blank, i) => (
              <button
                key={blank.id}
                onClick={() => setSelectedBlankId((prev) => prev === blank.id ? null : blank.id)}
                className={`puzzle-fill-panel__blank-chip${selectedBlankId === blank.id ? ' puzzle-fill-panel__blank-chip--selected' : ''}`}
              >
                <span className="puzzle-fill-panel__blank-index">_{i + 1}_</span>
                {blank.assignedWord
                  ? <span className="puzzle-fill-panel__blank-assigned">{blank.assignedWord}</span>
                  : <span className="puzzle-fill-panel__blank-empty">unassigned</span>
                }
                {blank.assignedWord && (
                  <button
                    onClick={(e) => { e.stopPropagation(); unassignBlank(blank.id) }}
                    className="puzzle-fill-panel__blank-unassign"
                    aria-label="Remove assignment"
                  >×</button>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Word chips */}
        <div className="puzzle-fill-panel__words">
          {fill.wordBank.map((entry) => (
            <div key={entry.id} className="puzzle-fill-panel__word-chip">
              <button
                onClick={() => selectedBlankId ? assignWord(entry.id) : undefined}
                className={`puzzle-fill-panel__word-label${selectedBlankId ? ' puzzle-fill-panel__word-label--assignable' : ''}`}
              >
                {entry.word}
              </button>
              <button
                onClick={() => removeWord(entry.id)}
                className="puzzle-fill-panel__word-remove"
                aria-label={`Remove ${entry.word}`}
              >×</button>
            </div>
          ))}
        </div>

        {/* Add word input */}
        <div className="puzzle-fill-panel__add-word">
          <input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addWord() } }}
            placeholder="Add word…"
            className="puzzle-fill-panel__word-input"
          />
          <button
            onClick={addWord}
            disabled={!newWord.trim()}
            className="puzzle-fill-panel__word-add-btn"
          >Add</button>
        </div>
      </div>
    </div>
  )
}
