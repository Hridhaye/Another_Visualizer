import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
} from 'reactflow'

import { MinimapControls } from './components/MinimapControls'
import { NarrativeCardNode } from './components/NarrativeCardNode'
import { NarrativeBodyPanel } from './components/NarrativeBodyPanel'
import { CardEditorFlyout } from './components/CardEditorFlyout'
import { Sidebar } from './components/Sidebar/Sidebar'
import { useNarrativeBoardStore } from './store/useNarrativeBoardStore'
import './App.css'
import './styles/card.css'
import './styles/sidebar.css'
import 'reactflow/dist/style.css'

function BoardCanvas() {
  const boardCanvasRef = useRef<HTMLDivElement | null>(null)
  const nodes = useNarrativeBoardStore((state) => state.nodes)
  const edges = useNarrativeBoardStore((state) => state.edges)
  const slipTypes = useNarrativeBoardStore((state) => state.slipTypes)
  const sidebarCollapsed = useNarrativeBoardStore((state) => state.sidebarCollapsed)
  const sectionsOpen = useNarrativeBoardStore((state) => state.sectionsOpen)
  const minimapVisible = useNarrativeBoardStore((state) => state.minimapVisible)
  const minimapCollapsed = useNarrativeBoardStore((state) => state.minimapCollapsed)

  const onNodesChange = useNarrativeBoardStore((state) => state.onNodesChange)
  const onEdgesChange = useNarrativeBoardStore((state) => state.onEdgesChange)
  const onConnect = useNarrativeBoardStore((state) => state.onConnect)
  const addCard = useNarrativeBoardStore((state) => state.addCard)
  const saveProject = useNarrativeBoardStore((state) => state.saveProject)
  const loadProject = useNarrativeBoardStore((state) => state.loadProject)
  const applyAIFormatImport = useNarrativeBoardStore((state) => state.applyAIFormatImport)
  const clearSelection = useNarrativeBoardStore((state) => state.clearSelection)
  const toggleSidebar = useNarrativeBoardStore((state) => state.toggleSidebar)
  const toggleSection = useNarrativeBoardStore((state) => state.toggleSection)
  const setMetadata = useNarrativeBoardStore((state) => state.setMetadata)
  const addSlipType = useNarrativeBoardStore((state) => state.addSlipType)
  const cycleMinimapState = useNarrativeBoardStore((state) => state.cycleMinimapState)
  const setViewport = useNarrativeBoardStore((state) => state.setViewport)
  const metadata = useNarrativeBoardStore((state) => state.metadata)
  const hasUnsavedChanges = useNarrativeBoardStore((state) => state.hasUnsavedChanges)
  const canUndo = useNarrativeBoardStore((state) => state.canUndo)
  const canRedo = useNarrativeBoardStore((state) => state.canRedo)
  const undo = useNarrativeBoardStore((state) => state.undo)
  const redo = useNarrativeBoardStore((state) => state.redo)
  const selectedNodeIds = useNarrativeBoardStore((state) => state.selectedNodeIds)
  const deleteSelectedCards = useNarrativeBoardStore((state) => state.deleteSelectedCards)
  const setSelectedNodes = useNarrativeBoardStore((state) => state.setSelectedNodes)
  const setConnectionSourceNode = useNarrativeBoardStore((state) => state.setConnectionSourceNode)
  const multiSelectMode = useNarrativeBoardStore((state) => state.multiSelectMode)
  const setMultiSelectMode = useNarrativeBoardStore((state) => state.setMultiSelectMode)
  const [selectionBox, setSelectionBox] = useState<{
    startX: number
    startY: number
    currentX: number
    currentY: number
  } | null>(null)
  const dragSelectionRef = useRef<{
    pointerId: number
    baseIds: string[]
    additive: boolean
  } | null>(null)

  const nodeTypes = useMemo(
    () => ({
      narrativeCard: NarrativeCardNode
    }),
    []
  )

  const performMarqueeSelection = useCallback((box: {
    startX: number
    startY: number
    currentX: number
    currentY: number
  }) => {
    const board = boardCanvasRef.current
    const dragSelection = dragSelectionRef.current
    if (!board || !dragSelection) {
      return
    }

    const left = Math.min(box.startX, box.currentX)
    const right = Math.max(box.startX, box.currentX)
    const top = Math.min(box.startY, box.currentY)
    const bottom = Math.max(box.startY, box.currentY)

    const idsInBox = Array.from(board.querySelectorAll<HTMLElement>('[data-card-id]'))
      .filter((card) => {
        const rect = card.getBoundingClientRect()
        return rect.right >= left && rect.left <= right && rect.bottom >= top && rect.top <= bottom
      })
      .map((card) => card.dataset.cardId)
      .filter((cardId): cardId is string => !!cardId)

    const nextIds = dragSelection.additive
      ? [...dragSelection.baseIds, ...idsInBox]
      : idsInBox

    setSelectedNodes(nextIds, idsInBox[idsInBox.length - 1] ?? nextIds[nextIds.length - 1] ?? null)
  }, [setSelectedNodes])

  const finishDragSelection = useCallback(() => {
    dragSelectionRef.current = null
    setSelectionBox(null)
  }, [])

  useEffect(() => {
    if (!selectionBox) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      const dragSelection = dragSelectionRef.current
      if (!dragSelection || dragSelection.pointerId !== event.pointerId) {
        return
      }

      const nextBox = {
        startX: selectionBox.startX,
        startY: selectionBox.startY,
        currentX: event.clientX,
        currentY: event.clientY
      }

      setSelectionBox(nextBox)
      performMarqueeSelection(nextBox)
      event.preventDefault()
    }

    const handlePointerUp = (event: PointerEvent) => {
      const dragSelection = dragSelectionRef.current
      if (!dragSelection || dragSelection.pointerId !== event.pointerId) {
        return
      }

      finishDragSelection()
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: false })
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [finishDragSelection, performMarqueeSelection, selectionBox])

  const beginDragSelection = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || event.altKey) {
      return
    }

    const target = event.target as HTMLElement | null
    if (!target) {
      return
    }

    const startedOnUi =
      !!target.closest('.history-bar') ||
      !!target.closest('.react-flow__controls') ||
      !!target.closest('.react-flow__panel') ||
      !!target.closest('.card-editor-flyout') ||
      !!target.closest('.narrative-body-panel')

    const startedOnCard = !!target.closest('[data-card-id]')
    const shouldStart = multiSelectMode ? !startedOnUi : !startedOnUi && !startedOnCard

    if (!shouldStart) {
      return
    }

    dragSelectionRef.current = {
      pointerId: event.pointerId,
      baseIds: multiSelectMode || event.ctrlKey || event.metaKey ? selectedNodeIds : [],
      additive: multiSelectMode || event.ctrlKey || event.metaKey
    }

    setConnectionSourceNode(null)
    setSelectionBox({
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY
    })

    event.preventDefault()
  }, [multiSelectMode, selectedNodeIds, setConnectionSourceNode])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.altKey) {
        return
      }

      const key = event.key.toLowerCase()
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
        return
      }

      if (key === 'z' && event.shiftKey) {
        event.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  return (
    <div className="board-root">
      <NarrativeBodyPanel />
      <CardEditorFlyout />
      <Sidebar
        collapsed={sidebarCollapsed}
        sectionsOpen={sectionsOpen}
        nodes={nodes}
        slipTypes={slipTypes}
        onToggleSidebar={toggleSidebar}
        onToggleSection={toggleSection}
        onSaveProject={saveProject}
        onLoadProject={loadProject}
        onImportAIFormat={applyAIFormatImport}
        onAddSlipType={addSlipType}
        projectName={metadata.projectName}
        updatedAt={metadata.updatedAt}
        hasUnsavedChanges={hasUnsavedChanges}
        onProjectNameChange={(value) => setMetadata({ ...metadata, projectName: value, updatedAt: metadata.updatedAt })}
      />

      <div
        ref={boardCanvasRef}
        className="board-canvas"
        onPointerDownCapture={beginDragSelection}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onPaneClick={clearSelection}
          onMoveEnd={(_, viewport) => setViewport(viewport)}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.2}
          maxZoom={1.8}
          panOnDrag={multiSelectMode ? false : [0, 1, 2]}
          nodesDraggable={!multiSelectMode}
          zoomOnPinch={true}
          zoomOnScroll={true}
          preventScrolling={true}
          className="reactflow-dark"
        >
          <Background color="#3f3f46" gap={26} />
          <Controls />
          <MinimapControls
            minimapVisible={minimapVisible}
            minimapCollapsed={minimapCollapsed}
            slipTypes={slipTypes}
            onCycleState={cycleMinimapState}
          />
        </ReactFlow>
        {(multiSelectMode || selectionBox) && (
          <div className={`selection-surface ${multiSelectMode ? 'selection-surface--active' : ''}`}>
            {multiSelectMode && (
              <div className="selection-surface__hint">
                Drag across cards to select multiple
              </div>
            )}
            {selectionBox && (
              <div
                className="selection-surface__box"
                style={{
                  left: Math.min(selectionBox.startX, selectionBox.currentX),
                  top: Math.min(selectionBox.startY, selectionBox.currentY),
                  width: Math.abs(selectionBox.currentX - selectionBox.startX),
                  height: Math.abs(selectionBox.currentY - selectionBox.startY)
                }}
              />
            )}
          </div>
        )}
        <div className="history-bar" role="toolbar" aria-label="History controls">
          <button
            onClick={() => setMultiSelectMode(!multiSelectMode)}
            className={`history-bar__btn ${multiSelectMode ? 'history-bar__btn--active' : ''}`}
            aria-pressed={multiSelectMode}
          >
            {multiSelectMode ? 'Done Selecting' : 'Select Cards'}
          </button>
          <div className="history-bar__divider" />
          <button
            onClick={addCard}
            className="history-bar__btn history-bar__btn--accent"
            aria-label="Add Card"
          >
            Add Card
          </button>
          <div className="history-bar__divider" />
          <button
            onClick={undo}
            disabled={!canUndo}
            className="history-bar__btn"
            aria-label="Undo"
          >
            Undo
          </button>
          <div className="history-bar__divider" />
          <button
            onClick={redo}
            disabled={!canRedo}
            className="history-bar__btn"
            aria-label="Redo"
          >
            Redo
          </button>
          <div className="history-bar__divider" />
          <button
            onClick={deleteSelectedCards}
            disabled={selectedNodeIds.length === 0}
            className="history-bar__btn history-bar__btn--danger"
            aria-label="Delete selected cards"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <ReactFlowProvider>
      <BoardCanvas />
    </ReactFlowProvider>
  )
}

export default App
