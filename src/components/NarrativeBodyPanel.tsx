import { useEffect, useRef } from 'react'
import { useNarrativeBoardStore } from '../store/useNarrativeBoardStore'

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
    </div>
  )
}
