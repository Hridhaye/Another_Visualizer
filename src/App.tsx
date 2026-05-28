import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  ReactFlowProvider,
} from 'reactflow'

import { NarrativeCardNode } from './components/NarrativeCardNode'
import { NarrativeEdgeComponent } from './components/edges/NarrativeEdge'
import { BiDirectionalEdge, BiDirectionalEdgeMarkerDef } from './components/edges/BiDirectionalEdge'
import { NarrativeBodyPanel } from './components/NarrativeBodyPanel'
import { PuzzleFillPanel } from './components/PuzzleFillPanel'
import { PuzzleReorderPanel } from './components/PuzzleReorderPanel'
import { PuzzleMatchingPanel } from './components/PuzzleMatchingPanel'
import { ContextPanel } from './components/ContextPanel'
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

  const selectedNodeId = useNarrativeBoardStore((state) => state.selectedNodeId)
  const contextPanelOpen = useNarrativeBoardStore((state) => state.contextPanelOpen)
  const closeContextPanel = useNarrativeBoardStore((state) => state.closeContextPanel)
  const updateNode = useNarrativeBoardStore((state) => state.updateNode)
  const deleteCard = useNarrativeBoardStore((state) => state.deleteCard)
  const connectionSourceNodeId = useNarrativeBoardStore((state) => state.connectionSourceNodeId)

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
  const renameSlipType = useNarrativeBoardStore((state) => state.renameSlipType)
  const deleteSlipType = useNarrativeBoardStore((state) => state.deleteSlipType)
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
  const matchingPickMode = useNarrativeBoardStore((state) => state.matchingPickMode)
  const commitMatchingPickMode = useNarrativeBoardStore((state) => state.commitMatchingPickMode)
  const groups = useNarrativeBoardStore((state) => state.groups)
  const createGroupFromSelection = useNarrativeBoardStore((state) => state.createGroupFromSelection)
  const toggleSelectionInGroup = useNarrativeBoardStore((state) => state.toggleSelectionInGroup)
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
  const [groupsPanelOpen, setGroupsPanelOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  const nodeTypes = useMemo(
    () => ({
      narrativeCard: NarrativeCardNode
    }),
    []
  )

  const edgeTypes = useMemo(
    () => ({
      narrativeEdge: NarrativeEdgeComponent,
      bidirectional: BiDirectionalEdge,
    }),
    []
  )

  const decoratedEdges = useMemo(() => {
    const LANE_SPACING = 12

    // Count how many edges leave each source node to assign lane offsets
    const sourceGroups: Record<string, string[]> = {}
    edges.forEach((edge) => {
      if (!sourceGroups[edge.source]) sourceGroups[edge.source] = []
      sourceGroups[edge.source].push(edge.id)
    })

    return edges.map((edge) => {
      const group = sourceGroups[edge.source] ?? []
      const indexInGroup = group.indexOf(edge.id)
      const groupSize = group.length
      // Center the fan: e.g. 3 edges → offsets -12, 0, +12
      const lateralShift = (indexInGroup - (groupSize - 1) / 2) * LANE_SPACING

      const isBidir = edge.data?.bidirectional === true
      const isOutgoingFromSelected =
        selectedNodeId !== null &&
        (edge.source === selectedNodeId || (isBidir && edge.target === selectedNodeId))

      return {
        ...edge,
        data: {
          ...edge.data,
          isOutgoingFromSelected,
          lateralShift,
        },
      }
    })
  }, [edges, selectedNodeId])

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
    const shouldStart =
      multiSelectMode
        ? !startedOnUi
        : (event.shiftKey && !startedOnUi && !startedOnCard)

    if (!shouldStart) {
      return
    }

    dragSelectionRef.current = {
      pointerId: event.pointerId,
      baseIds: (multiSelectMode || event.ctrlKey || event.metaKey) ? selectedNodeIds : [],
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

  useEffect(() => {
    if (selectedNodeIds.length < 2 && groupsPanelOpen) {
      setGroupsPanelOpen(false)
    }
  }, [groupsPanelOpen, selectedNodeIds.length])

  const activeNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null
  const showContextPanel = !!activeNode && contextPanelOpen

  return (
    <div className="board-root">
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        <BiDirectionalEdgeMarkerDef />
      </svg>
      <NarrativeBodyPanel />
      <PuzzleFillPanel />
      <PuzzleReorderPanel />
      <PuzzleMatchingPanel />
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
        onRenameSlipType={renameSlipType}
        onDeleteSlipType={deleteSlipType}
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
          edges={decoratedEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
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
        </ReactFlow>
        {(multiSelectMode || selectionBox) && (
          <div className={`selection-surface ${multiSelectMode ? 'selection-surface--active' : ''}`}>
            {multiSelectMode && (
              <div className="selection-surface__hint">
                Drag across cards to select multiple
              </div>
            )}
            {!multiSelectMode && selectionBox && (
              <div className="selection-surface__hint">
                Shift+drag to select cards
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
        {matchingPickMode && (
          <div className="matching-pick-banner">
            <span className="matching-pick-banner__text">Click cards to add them to the puzzle</span>
            <button onClick={commitMatchingPickMode} className="matching-pick-banner__done">Done</button>
          </div>
        )}
        {showContextPanel && (
          <ContextPanel
            node={activeNode}
            allNodes={nodes}
            slipTypes={slipTypes}
            isLinkSource={connectionSourceNodeId === activeNode.id}
            onUpdate={updateNode}
            onDelete={deleteCard}
            onClose={closeContextPanel}
            onToggleLink={() => setConnectionSourceNode(connectionSourceNodeId === activeNode.id ? null : activeNode.id)}
          />
        )}
        <div className="history-bar" role="toolbar" aria-label="History controls">
          {groupsPanelOpen && selectedNodeIds.length > 1 && (
            <div className="history-bar__overlay">
              <div className="group-panel">
                <div className="group-panel__header">
                  <div>
                    <h3 className="group-panel__title">Groups</h3>
                    <p className="group-panel__subtitle">
                      Create a new group or toggle this selection into an existing one.
                    </p>
                  </div>
                  <button
                    onClick={() => setGroupsPanelOpen(false)}
                    className="group-panel__close"
                    aria-label="Close groups panel"
                  >
                    x
                  </button>
                </div>

                <div className="group-panel__create">
                  <input
                    value={newGroupName}
                    onChange={(event) => setNewGroupName(event.target.value)}
                    className="group-panel__input"
                    placeholder="New group name"
                  />
                  <button
                    onClick={() => {
                      if (!newGroupName.trim()) {
                        return
                      }
                      createGroupFromSelection(newGroupName)
                      setNewGroupName('')
                    }}
                    className="group-panel__action group-panel__action--primary"
                  >
                    Create
                  </button>
                </div>

                <div className="group-panel__list">
                  {groups.length === 0 && (
                    <p className="group-panel__empty">No groups yet.</p>
                  )}
                  {groups.map((group) => {
                    const allSelectedAlreadyInGroup = selectedNodeIds.every((nodeId) =>
                      group.nodeIds.includes(nodeId)
                    )

                    return (
                      <button
                        key={group.id}
                        onClick={() => toggleSelectionInGroup(group.id)}
                        className="group-panel__item"
                      >
                        <span className="group-panel__item-name">{group.name}</span>
                        <span className="group-panel__item-meta">
                          {group.nodeIds.length} cards
                        </span>
                        <span className="group-panel__item-action">
                          {allSelectedAlreadyInGroup ? 'Remove selection' : 'Add selection'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
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
            onClick={() => setGroupsPanelOpen((open) => !open)}
            disabled={selectedNodeIds.length < 2}
            className="history-bar__btn"
            aria-label="Manage groups for selected cards"
          >
            Groups
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
