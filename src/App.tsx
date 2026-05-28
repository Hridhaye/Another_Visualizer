import { useEffect, useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  type NodeMouseHandler
} from 'reactflow'

import { MinimapControls } from './components/MinimapControls'
import { NarrativeCardNode } from './components/NarrativeCardNode'
import { Sidebar } from './components/Sidebar/Sidebar'
import { useNarrativeBoardStore } from './store/useNarrativeBoardStore'
import './App.css'
import './styles/card.css'
import './styles/sidebar.css'
import 'reactflow/dist/style.css'

function BoardCanvas() {
  const nodes = useNarrativeBoardStore((state) => state.nodes)
  const edges = useNarrativeBoardStore((state) => state.edges)
  const selectedNodeId = useNarrativeBoardStore((state) => state.selectedNodeId)
  const slipTypes = useNarrativeBoardStore((state) => state.slipTypes)
  const sidebarCollapsed = useNarrativeBoardStore((state) => state.sidebarCollapsed)
  const sectionsOpen = useNarrativeBoardStore((state) => state.sectionsOpen)
  const connectionSourceNodeId = useNarrativeBoardStore((state) => state.connectionSourceNodeId)
  const minimapVisible = useNarrativeBoardStore((state) => state.minimapVisible)
  const minimapCollapsed = useNarrativeBoardStore((state) => state.minimapCollapsed)

  const onNodesChange = useNarrativeBoardStore((state) => state.onNodesChange)
  const onEdgesChange = useNarrativeBoardStore((state) => state.onEdgesChange)
  const onConnect = useNarrativeBoardStore((state) => state.onConnect)
  const addCard = useNarrativeBoardStore((state) => state.addCard)
  const updateNode = useNarrativeBoardStore((state) => state.updateNode)
  const saveProject = useNarrativeBoardStore((state) => state.saveProject)
  const loadProject = useNarrativeBoardStore((state) => state.loadProject)
  const applyAIFormatImport = useNarrativeBoardStore((state) => state.applyAIFormatImport)
  const setSelectedNode = useNarrativeBoardStore((state) => state.setSelectedNode)
  const clearSelection = useNarrativeBoardStore((state) => state.clearSelection)
  const toggleSidebar = useNarrativeBoardStore((state) => state.toggleSidebar)
  const toggleSection = useNarrativeBoardStore((state) => state.toggleSection)
  const setMetadata = useNarrativeBoardStore((state) => state.setMetadata)
  const addSlipType = useNarrativeBoardStore((state) => state.addSlipType)
  const createReferenceConnection = useNarrativeBoardStore((state) => state.createReferenceConnection)
  const cycleMinimapState = useNarrativeBoardStore((state) => state.cycleMinimapState)
  const setViewport = useNarrativeBoardStore((state) => state.setViewport)
  const metadata = useNarrativeBoardStore((state) => state.metadata)
  const hasUnsavedChanges = useNarrativeBoardStore((state) => state.hasUnsavedChanges)
  const canUndo = useNarrativeBoardStore((state) => state.canUndo)
  const canRedo = useNarrativeBoardStore((state) => state.canRedo)
  const undo = useNarrativeBoardStore((state) => state.undo)
  const redo = useNarrativeBoardStore((state) => state.redo)

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null
  const nodeTypes = useMemo(
    () => ({
      narrativeCard: NarrativeCardNode
    }),
    []
  )

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    setSelectedNode(node.id)

    if (connectionSourceNodeId && connectionSourceNodeId !== node.id) {
      createReferenceConnection(connectionSourceNodeId, node.id)
    }
  }

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
      <Sidebar
        collapsed={sidebarCollapsed}
        sectionsOpen={sectionsOpen}
        nodes={nodes}
        selectedNode={selectedNode}
        slipTypes={slipTypes}
        onToggleSidebar={toggleSidebar}
        onToggleSection={toggleSection}
        onAddCard={addCard}
        onSaveProject={saveProject}
        onLoadProject={loadProject}
        onImportAIFormat={applyAIFormatImport}
        onAddSlipType={addSlipType}
        projectName={metadata.projectName}
        updatedAt={metadata.updatedAt}
        hasUnsavedChanges={hasUnsavedChanges}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onProjectNameChange={(value) => setMetadata({ ...metadata, projectName: value, updatedAt: metadata.updatedAt })}
        onUpdateNode={updateNode}
      />

      <div className="board-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onPaneClick={clearSelection}
          onMoveEnd={(_, viewport) => setViewport(viewport)}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.2}
          maxZoom={1.8}
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
