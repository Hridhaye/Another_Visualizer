import { useEffect, useRef, useState } from 'react'
import { useNarrativeBoardStore } from '../store/useNarrativeBoardStore'
import type { ReorderBox, ReorderPuzzleContent } from '../types/narrative'
import { exportReorderDSL, importReorderDSL } from '../ai/panelDSL'
import { PanelDSLControls } from './PanelDSLControls'

function emptyReorder(): ReorderPuzzleContent {
  return { boxes: [], scrambledOrder: [], solutionOrder: [] }
}

type SectionKey = 'scrambled' | 'solution'

type DragState = {
  section: SectionKey
  fromIndex: number
} | null

// Touch drag state for handle-only dragging on mobile
type TouchDragState = {
  section: SectionKey
  fromIndex: number
  startY: number
  currentDropIndex: number
} | null

export function PuzzleReorderPanel() {
  const puzzleBodyOpen = useNarrativeBoardStore((s) => s.puzzleBodyOpen)
  const closePuzzleBody = useNarrativeBoardStore((s) => s.closePuzzleBody)
  const selectedNodeId = useNarrativeBoardStore((s) => s.selectedNodeId)
  const selectedNodeIds = useNarrativeBoardStore((s) => s.selectedNodeIds)
  const nodes = useNarrativeBoardStore((s) => s.nodes)
  const updateNode = useNarrativeBoardStore((s) => s.updateNode)

  const node = nodes.find((n) => n.id === selectedNodeId) ?? null
  const hasSingleSelection = selectedNodeIds.length === 1

  const reorder: ReorderPuzzleContent = node?.data.puzzleReorderContent ?? emptyReorder()

  // track which box id is being edited inline, and in which section
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null)
  const [editText, setEditText] = useState('')
  const editRef = useRef<HTMLTextAreaElement | null>(null)

  // HTML5 drag state (desktop)
  const dragRef = useRef<DragState>(null)
  const [dropTarget, setDropTarget] = useState<{ section: SectionKey; index: number } | null>(null)

  // Touch/pointer drag state (mobile & tablet handle dragging)
  const touchDragRef = useRef<TouchDragState>(null)
  const boxRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => {
    if (!puzzleBodyOpen) { setEditingId(null); setEditingSection(null) }
  }, [puzzleBodyOpen])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closePuzzleBody()
    }
    if (puzzleBodyOpen) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [puzzleBodyOpen, closePuzzleBody])

  useEffect(() => {
    if (editingId && editRef.current) {
      const el = editRef.current
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
      el.focus()
      const len = el.value.length
      el.setSelectionRange(len, len)
    }
  }, [editingId])

  if (!puzzleBodyOpen || !node || !hasSingleSelection) return null
  if (node.data.puzzleType !== 'reorder') return null

  function save(patch: Partial<ReorderPuzzleContent>) {
    if (!node) return
    updateNode(node.id, { puzzleReorderContent: { ...reorder, ...patch } })
  }

  function addBox() {
    const id = crypto.randomUUID()
    const newBox: ReorderBox = { id, text: '' }
    const nextBoxes = [...reorder.boxes, newBox]
    const nextScrambled = [...reorder.scrambledOrder, id]
    const nextSolution = [...reorder.solutionOrder, id]
    save({ boxes: nextBoxes, scrambledOrder: nextScrambled, solutionOrder: nextSolution })
    // immediately enter edit mode for the new box
    setEditingId(id)
    setEditText('')
  }

  function handleImportReorder(raw: string): string {
    if (!node) return ''
    const content = importReorderDSL(raw)
    updateNode(node.id, { puzzleReorderContent: content })
    setEditingId(null)
    setEditingSection(null)
    return `Imported ${content.boxes.length} box${content.boxes.length !== 1 ? 'es' : ''}`
  }

  function deleteBox(id: string) {
    if (editingId === id) { setEditingId(null); setEditingSection(null) }
    save({
      boxes: reorder.boxes.filter((b) => b.id !== id),
      scrambledOrder: reorder.scrambledOrder.filter((bid) => bid !== id),
      solutionOrder: reorder.solutionOrder.filter((bid) => bid !== id),
    })
  }

  function commitEdit(id: string) {
    save({ boxes: reorder.boxes.map((b) => b.id === id ? { ...b, text: editText } : b) })
    setEditingId(null)
    setEditingSection(null)
  }

  function startEdit(box: ReorderBox, section: SectionKey) {
    setEditingId(box.id)
    setEditingSection(section)
    setEditText(box.text)
    // focus is handled via the editRef useEffect above
  }

  // ── Drag helpers ──────────────────────────────────────────────────────

  function reorderIds(ids: string[], from: number, to: number): string[] {
    const next = [...ids]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    return next
  }

  // Touch-friendly reorder: HTML5 drag-and-drop doesn't fire on touch devices,
  // so each box also has up/down buttons that move it within its section.
  function moveBox(section: SectionKey, index: number, direction: -1 | 1) {
    const key = section === 'scrambled' ? 'scrambledOrder' : 'solutionOrder'
    const order = reorder[key]
    const to = index + direction
    if (to < 0 || to >= order.length) return
    save({ [key]: reorderIds(order, index, to) })
  }

  function onDragStart(section: SectionKey, index: number) {
    dragRef.current = { section, fromIndex: index }
  }

  function onDragEnter(section: SectionKey, index: number) {
    setDropTarget({ section, index })
  }

  function onDragEnd() {
    const drag = dragRef.current
    const drop = dropTarget
    dragRef.current = null
    setDropTarget(null)

    if (!drag || !drop) return
    if (drag.section !== drop.section) return
    if (drag.fromIndex === drop.index) return

    const key = drag.section === 'scrambled' ? 'scrambledOrder' : 'solutionOrder'
    save({ [key]: reorderIds(reorder[key], drag.fromIndex, drop.index) })
  }

  // ── Touch / pointer drag helpers (handle-only, mobile-friendly) ──────

  function onHandlePointerDown(e: React.PointerEvent, section: SectionKey, index: number) {
    // Only start touch drag on non-mouse pointers to avoid interfering with desktop HTML5 drag
    if (e.pointerType === 'mouse') return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    touchDragRef.current = { section, fromIndex: index, startY: e.clientY, currentDropIndex: index }
    setDropTarget({ section, index })
  }

  function onHandlePointerMove(e: React.PointerEvent, section: SectionKey, order: string[]) {
    const drag = touchDragRef.current
    if (!drag || drag.section !== section) return
    e.preventDefault()

    // Find which box the pointer is currently over by checking Y positions
    let closestIndex = drag.fromIndex
    let closestDist = Infinity
    order.forEach((id, i) => {
      const el = boxRefs.current.get(id)
      if (!el) return
      const rect = el.getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      const dist = Math.abs(e.clientY - midY)
      if (dist < closestDist) { closestDist = dist; closestIndex = i }
    })

    if (closestIndex !== drag.currentDropIndex) {
      touchDragRef.current = { ...drag, currentDropIndex: closestIndex }
      setDropTarget({ section, index: closestIndex })
    }
  }

  function onHandlePointerUp(e: React.PointerEvent, section: SectionKey) {
    const drag = touchDragRef.current
    if (!drag || drag.section !== section) return
    touchDragRef.current = null
    setDropTarget(null)
    if (drag.fromIndex === drag.currentDropIndex) return
    const key = section === 'scrambled' ? 'scrambledOrder' : 'solutionOrder'
    save({ [key]: reorderIds(reorder[key], drag.fromIndex, drag.currentDropIndex) })
  }

  function orderedBoxes(order: string[]): ReorderBox[] {
    return order.map((id) => reorder.boxes.find((b) => b.id === id)).filter(Boolean) as ReorderBox[]
  }

  function renderSection(section: SectionKey, label: string) {
    const order = section === 'scrambled' ? reorder.scrambledOrder : reorder.solutionOrder
    const boxes = orderedBoxes(order)

    return (
      <div className="puzzle-reorder-panel__section">
        <div className="puzzle-reorder-panel__section-header">
          <span className="puzzle-reorder-panel__section-label">{label}</span>
        </div>
        <div
          className="puzzle-reorder-panel__boxes"
          onDragOver={(e) => e.preventDefault()}
          onPointerMove={(e) => onHandlePointerMove(e as React.PointerEvent, section, order)}
          onPointerUp={(e) => onHandlePointerUp(e as React.PointerEvent, section)}
          onPointerCancel={(e) => onHandlePointerUp(e as React.PointerEvent, section)}
        >
          {boxes.map((box, i) => {
            const isDragOver = dropTarget?.section === section && dropTarget.index === i
            const isDragging =
              (dragRef.current?.section === section && dragRef.current.fromIndex === i) ||
              (touchDragRef.current?.section === section && touchDragRef.current.fromIndex === i)

            return (
              <div
                key={box.id}
                ref={(el) => {
                  if (el) boxRefs.current.set(box.id, el)
                  else boxRefs.current.delete(box.id)
                }}
                className={[
                  'puzzle-reorder-panel__box',
                  isDragOver ? 'puzzle-reorder-panel__box--drop-target' : '',
                  isDragging ? 'puzzle-reorder-panel__box--dragging' : '',
                ].join(' ').trim()}
              >
                {/* Handle: draggable on desktop via HTML5, touch-draggable on mobile via pointer events */}
                <span
                  className="puzzle-reorder-panel__box-handle"
                  aria-hidden
                  draggable={editingId !== box.id}
                  onDragStart={() => onDragStart(section, i)}
                  onDragEnter={() => onDragEnter(section, i)}
                  onDragEnd={onDragEnd}
                  onPointerDown={(e) => onHandlePointerDown(e, section, i)}
                >⠿</span>

                {editingId === box.id && editingSection === section ? (
                  <textarea
                    ref={editRef}
                    value={editText}
                    onChange={(e) => {
                      setEditText(e.target.value)
                      e.target.style.height = 'auto'
                      e.target.style.height = e.target.scrollHeight + 'px'
                    }}
                    onBlur={() => commitEdit(box.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(box.id) }
                      if (e.key === 'Escape') { setEditingId(null); setEditingSection(null) }
                    }}
                    className="puzzle-reorder-panel__box-input"
                  />
                ) : (
                  <span
                    className="puzzle-reorder-panel__box-text"
                    onClick={() => startEdit(box, section)}
                    title="Click to edit"
                  >
                    {box.text || <span className="puzzle-reorder-panel__box-placeholder">click to edit</span>}
                  </span>
                )}

                <div className="puzzle-reorder-panel__box-controls">
                  <button
                    onClick={() => moveBox(section, i, -1)}
                    disabled={i === 0}
                    className="puzzle-reorder-panel__box-move"
                    aria-label="Move up"
                    title="Move up"
                  >▲</button>
                  <button
                    onClick={() => moveBox(section, i, 1)}
                    disabled={i === boxes.length - 1}
                    className="puzzle-reorder-panel__box-move"
                    aria-label="Move down"
                    title="Move down"
                  >▼</button>
                  <button
                    onClick={() => deleteBox(box.id)}
                    className="puzzle-reorder-panel__box-delete"
                    aria-label="Delete box"
                  >×</button>
                </div>
              </div>
            )
          })}

          {boxes.length === 0 && (
            <p className="puzzle-reorder-panel__empty">No boxes yet.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="narrative-body-panel puzzle-reorder-panel"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="narrative-body-panel__header">
        <div className="narrative-body-panel__meta">
          <span className="narrative-body-panel__code">{node.data.code}</span>
          <span className="narrative-body-panel__title">{node.data.title}</span>
          <span className="puzzle-fill-panel__type-badge">Reorder</span>
        </div>

        <div className="narrative-body-panel__toolbar">
          <button
            onClick={addBox}
            className="puzzle-reorder-panel__add-btn"
          >+ Box</button>
          <div className="panel-dsl-divider" />
          <PanelDSLControls
            label="Reorder Puzzle"
            onExport={() => exportReorderDSL(reorder)}
            onImport={handleImportReorder}
          />
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

      {/* Two sections */}
      <div className="puzzle-reorder-panel__body">
        {renderSection('scrambled', 'Scrambled order')}
        <div className="puzzle-reorder-panel__divider" />
        {renderSection('solution', 'Solution order')}
      </div>
    </div>
  )
}
