import { useMemo } from 'react'
import ReactFlow, { Background, Controls, ReactFlowProvider, type NodeMouseHandler } from 'reactflow'

import { ContextPanel } from './components/ContextPanel'
import { MinimapControls } from './components/MinimapControls'
import { NarrativeCardNode } from './components/NarrativeCardNode'
import { Sidebar } from './components/Sidebar/Sidebar'
import { useNarrativeBoardStore } from './store/useNarrativeBoardStore'
import './App.css'
import './styles/card.css'
import 'reactflow/dist/style.css'

function App() {
  const nodes = useNarrativeBoardStore((state) => state.nodes)
  const edges = useNarrativeBoardStore((state) => state.edges)
  const selectedNodeId = useNarrativeBoardStore((state) => state.selectedNodeId)
  const slipTypes = useNarrativeBoardStore((state) => state.slipTypes)
  const sidebarCollapsed = useNarrativeBoardStore((state) => state.sidebarCollapsed)
  const sectionsOpen = useNarrativeBoardStore((state) => state.sectionsOpen)
  const contextPanelPosition = useNarrativeBoardStore((state) => state.contextPanelPosition)
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
  const setSelectedNode = useNarrativeBoardStore((state) => state.setSelectedNode)
  const clearSelection = useNarrativeBoardStore((state) => state.clearSelection)
  const toggleSidebar = useNarrativeBoardStore((state) => state.toggleSidebar)
  const toggleSection = useNarrativeBoardStore((state) => state.toggleSection)
  const setContextPanelPosition = useNarrativeBoardStore((state) => state.setContextPanelPosition)
  const setConnectionSourceNode = useNarrativeBoardStore((state) => state.setConnectionSourceNode)
  const setMetadata = useNarrativeBoardStore((state) => state.setMetadata)
  const openFullEditor = useNarrativeBoardStore((state) => state.openFullEditor)
  const addSlipType = useNarrativeBoardStore((state) => state.addSlipType)
  const createReferenceConnection = useNarrativeBoardStore((state) => state.createReferenceConnection)
  const cycleMinimapState = useNarrativeBoardStore((state) => state.cycleMinimapState)
  const setViewport = useNarrativeBoardStore((state) => state.setViewport)
  const metadata = useNarrativeBoardStore((state) => state.metadata)
  const hasUnsavedChanges = useNarrativeBoardStore((state) => state.hasUnsavedChanges)

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null
  const nodeTypes = useMemo(
    () => ({
      narrativeCard: NarrativeCardNode
    }),
    []
  )

  const handleNodeClick: NodeMouseHandler = (event, node) => {
    setSelectedNode(node.id)
    setContextPanelPosition({ x: event.clientX, y: event.clientY })

    if (connectionSourceNodeId && connectionSourceNodeId !== node.id) {
      createReferenceConnection(connectionSourceNodeId, node.id)
    }
  }

  return (
    <ReactFlowProvider>
      <div className="board-root">
        <Sidebar
          collapsed={sidebarCollapsed}
          sectionsOpen={sectionsOpen}
          selectedNode={selectedNode}
          slipTypes={slipTypes}
          onToggleSidebar={toggleSidebar}
          onToggleSection={toggleSection}
          onAddCard={addCard}
          onSaveProject={saveProject}
          onLoadProject={loadProject}
          onAddSlipType={addSlipType}
          projectName={metadata.projectName}
          updatedAt={metadata.updatedAt}
          hasUnsavedChanges={hasUnsavedChanges}
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

          {selectedNode && (
            <ContextPanel
              selectedNode={selectedNode}
              slipTypes={slipTypes}
              contextPanelPosition={contextPanelPosition}
              connectionSourceNodeId={connectionSourceNodeId}
              onClose={clearSelection}
              onUpdate={updateNode}
              onToggleLinkMode={(nodeId) => {
                setConnectionSourceNode(connectionSourceNodeId === nodeId ? null : nodeId)
              }}
              onOpenFullEditor={openFullEditor}
            />
          )}
        </div>
      </div>
    </ReactFlowProvider>
  )
}

export default App
