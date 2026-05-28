import { useMemo } from 'react'
import ReactFlow, { Background, Controls, type NodeMouseHandler } from 'reactflow'

import { ContextPanel } from './components/ContextPanel'
import { MinimapControls } from './components/MinimapControls'
import { NarrativeCardNode } from './components/NarrativeCardNode'
import { Sidebar } from './components/Sidebar/Sidebar'
import { useNarrativeBoardStore } from './store/useNarrativeBoardStore'
import type { CardData } from './types/narrative'

import 'reactflow/dist/style.css'
import './styles/card.css'

const nodeTypes = {
  narrativeCard: NarrativeCardNode
}

export default function App() {
  const nodes = useNarrativeBoardStore((state) => state.nodes)
  const edges = useNarrativeBoardStore((state) => state.edges)
  const selectedNodeId = useNarrativeBoardStore((state) => state.selectedNodeId)
  const slipTypes = useNarrativeBoardStore((state) => state.slipTypes)
  const sidebarCollapsed = useNarrativeBoardStore((state) => state.sidebarCollapsed)
  const sectionsOpen = useNarrativeBoardStore((state) => state.sectionsOpen)
  const connectionSourceNodeId = useNarrativeBoardStore(
    (state) => state.connectionSourceNodeId
  )
  const contextPanelPosition = useNarrativeBoardStore(
    (state) => state.contextPanelPosition
  )
  const minimapVisible = useNarrativeBoardStore((state) => state.minimapVisible)
  const minimapCollapsed = useNarrativeBoardStore((state) => state.minimapCollapsed)

  const onNodesChange = useNarrativeBoardStore((state) => state.onNodesChange)
  const onEdgesChange = useNarrativeBoardStore((state) => state.onEdgesChange)
  const onConnect = useNarrativeBoardStore((state) => state.onConnect)
  const addCard = useNarrativeBoardStore((state) => state.addCard)
  const updateNode = useNarrativeBoardStore((state) => state.updateNode)
  const createReferenceConnection = useNarrativeBoardStore(
    (state) => state.createReferenceConnection
  )
  const addSlipType = useNarrativeBoardStore((state) => state.addSlipType)
  const exportProject = useNarrativeBoardStore((state) => state.exportProject)
  const setSelectedNode = useNarrativeBoardStore((state) => state.setSelectedNode)
  const clearSelection = useNarrativeBoardStore((state) => state.clearSelection)
  const toggleSidebar = useNarrativeBoardStore((state) => state.toggleSidebar)
  const toggleSection = useNarrativeBoardStore((state) => state.toggleSection)
  const setContextPanelPosition = useNarrativeBoardStore(
    (state) => state.setContextPanelPosition
  )
  const setConnectionSourceNode = useNarrativeBoardStore(
    (state) => state.setConnectionSourceNode
  )
  const openFullEditor = useNarrativeBoardStore((state) => state.openFullEditor)
  const cycleMinimapState = useNarrativeBoardStore((state) => state.cycleMinimapState)

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) {
      return null
    }
    return nodes.find((node) => node.id === selectedNodeId) ?? null
  }, [nodes, selectedNodeId])

  const onNodeClick: NodeMouseHandler<CardData> = (event, node) => {
    setContextPanelPosition({
      x: event.clientX,
      y: event.clientY
    })

    if (connectionSourceNodeId && connectionSourceNodeId !== node.id) {
      createReferenceConnection(connectionSourceNodeId, node.id)
      return
    }

    setSelectedNode(node.id)
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-white">
      <Sidebar
        collapsed={sidebarCollapsed}
        sectionsOpen={sectionsOpen}
        selectedNode={selectedNode}
        slipTypes={slipTypes}
        onToggleSidebar={toggleSidebar}
        onToggleSection={toggleSection}
        onAddCard={addCard}
        onExportProject={exportProject}
        onAddSlipType={addSlipType}
        onUpdateNode={updateNode}
      />

      <div className="h-full flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={clearSelection}
          fitView
          defaultEdgeOptions={{ type: 'smoothstep' }}
        >
          <Background />

          {selectedNode ? (
            <ContextPanel
              selectedNode={selectedNode}
              slipTypes={slipTypes}
              contextPanelPosition={contextPanelPosition}
              connectionSourceNodeId={connectionSourceNodeId}
              onClose={clearSelection}
              onUpdate={updateNode}
              onToggleLinkMode={(nodeId) => {
                setConnectionSourceNode(
                  connectionSourceNodeId === nodeId ? null : nodeId
                )
              }}
              onOpenFullEditor={openFullEditor}
            />
          ) : null}

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
