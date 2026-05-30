import { useEffect, useRef } from 'react'
import { useNarrativeBoardStore } from '../store/useNarrativeBoardStore'
import { exportBodyDSL, importBodyDSL, exportNotesDSL, importNotesDSL } from '../ai/panelDSL'
import { PanelDSLControls } from './PanelDSLControls'

const DEFAULT_NOTES_HEIGHT = 160
const MIN_NOTES_HEIGHT = 80
const MAX_NOTES_HEIGHT = 600

export function NarrativeBodyPanel() {
  const narrativeBodyOpen = useNarrativeBoardStore((s) => s.narrativeBodyOpen)
  const closeNarrativeBody = useNarrativeBoardStore((s) => s.closeNarrativeBody)
  const selectedNodeId = useNarrativeBoardStore((s) => s.selectedNodeId)
  const selectedNodeIds = useNarrativeBoardStore((s) => s.selectedNodeIds)
  const nodes = useNarrativeBoardStore((s) => s.nodes)
  const updateNode = useNarrativeBoardStore((s) => s.updateNode)

  const node = nodes.find((n) => n.id === selectedNodeId) ?? null
  const hasSingleSelection = selectedNodeIds.length === 1
  const bodyEditorRef = useRef<HTMLDivElement | null>(null)

  const notesOpen = node?.data.notesOpen ?? false
  const notesHeight = node?.data.notesHeight ?? DEFAULT_NOTES_HEIGHT

  function syncBody() {
    const editor = bodyEditorRef.current
    if (!editor || !node) return
    updateNode(node.id, { body: editor.innerHTML })
  }

  function applyFormat(command: 'bold' | 'italic' | 'underline') {
    const editor = bodyEditorRef.current
    if (!editor) return
    editor.focus()
    document.execCommand(command)
    syncBody()
  }

  function handleImportBody(raw: string): string {
    if (!node) return ''
    const html = importBodyDSL(raw)
    updateNode(node.id, { body: html })
    if (bodyEditorRef.current) bodyEditorRef.current.innerHTML = html
    return 'Body imported'
  }

  function handleImportNotes(raw: string): string {
    if (!node) return ''
    const notes = importNotesDSL(raw)
    // Reveal the pane so the imported notes are immediately visible.
    updateNode(node.id, { notes, notesOpen: true })
    return 'Notes imported'
  }

  function toggleNotes() {
    if (!node) return
    updateNode(node.id, { notesOpen: !notesOpen })
  }

  function startResizeNotes(e: React.PointerEvent) {
    if (!node) return
    e.preventDefault()
    const startY = e.clientY
    const startHeight = notesHeight
    // Grip sits above the pad, so dragging up (negative delta) grows it.
    function onMove(ev: PointerEvent) {
      const next = Math.min(
        MAX_NOTES_HEIGHT,
        Math.max(MIN_NOTES_HEIGHT, startHeight - (ev.clientY - startY)),
      )
      if (node) updateNode(node.id, { notesHeight: next })
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  useEffect(() => {
    if (!narrativeBodyOpen || !node) return
    const editor = bodyEditorRef.current
    if (!editor) return
    if (editor.innerHTML !== node.data.body) {
      editor.innerHTML = node.data.body
    }
  }, [narrativeBodyOpen, node?.id])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeNarrativeBody()
    }
    if (narrativeBodyOpen) {
      window.addEventListener('keydown', onKeyDown)
    }
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [narrativeBodyOpen, closeNarrativeBody])

  if (!narrativeBodyOpen || !node || !hasSingleSelection) return null

  return (
    <div
      className="narrative-body-panel"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="narrative-body-panel__header">
        <div className="narrative-body-panel__meta">
          <span className="narrative-body-panel__code">{node.data.code}</span>
          <span className="narrative-body-panel__title">{node.data.title}</span>
        </div>
        <div className="narrative-body-panel__toolbar">
          <button
            onClick={() => applyFormat('bold')}
            className="narrative-body-panel__fmt-btn narrative-body-panel__fmt-btn--bold"
            aria-label="Bold"
          >B</button>
          <button
            onClick={() => applyFormat('italic')}
            className="narrative-body-panel__fmt-btn narrative-body-panel__fmt-btn--italic"
            aria-label="Italic"
          >I</button>
          <button
            onClick={() => applyFormat('underline')}
            className="narrative-body-panel__fmt-btn narrative-body-panel__fmt-btn--underline"
            aria-label="Underline"
          >U</button>
          <div className="panel-dsl-divider" />
          <PanelDSLControls
            label="Narrative Body"
            onExport={() => exportBodyDSL(node.data.body)}
            onImport={handleImportBody}
          />
        </div>
        <button
          onClick={closeNarrativeBody}
          className="narrative-body-panel__close"
          aria-label="Close narrative body"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div
        ref={bodyEditorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={syncBody}
        onKeyDown={(e) => {
          const isMod = e.ctrlKey || e.metaKey
          if (!isMod) return
          const key = e.key.toLowerCase()
          if (key === 'b') { e.preventDefault(); applyFormat('bold') }
          else if (key === 'i') { e.preventDefault(); applyFormat('italic') }
          else if (key === 'u') { e.preventDefault(); applyFormat('underline') }
        }}
        className="narrative-body-panel__editor"
      />

      <div className={`rough-notes${notesOpen ? ' rough-notes--open' : ''}`}>
        <div className="rough-notes__bar">
          <button
            type="button"
            className="rough-notes__header"
            onClick={toggleNotes}
            aria-expanded={notesOpen}
          >
            <span className={`rough-notes__chevron${notesOpen ? ' rough-notes__chevron--open' : ''}`}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="rough-notes__title">Rough Notes</span>
          </button>
          <div className="rough-notes__dsl">
            <PanelDSLControls
              label="Rough Notes"
              onExport={() => exportNotesDSL(node.data.notes ?? '')}
              onImport={handleImportNotes}
            />
          </div>
        </div>

        {notesOpen && (
          <>
            <div
              className="rough-notes__resize"
              onPointerDown={startResizeNotes}
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize rough notes"
            />
            <textarea
              className="rough-notes__pad"
              style={{ height: notesHeight }}
              value={node.data.notes ?? ''}
              placeholder="Jot down rough notes…"
              onChange={(e) => updateNode(node.id, { notes: e.target.value })}
            />
          </>
        )}
      </div>
    </div>
  )
}
