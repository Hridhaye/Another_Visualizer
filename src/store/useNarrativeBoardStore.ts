import { create } from 'zustand'
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange
} from 'reactflow'

import { buildEdgesFromReferences, parseReferences } from '../graph/buildEdgesFromReferences'
import { generateNextCode } from '../graph/generateNextCode'
import type {
  CardData,
  ContextPanelPosition,
  NarrativeEdge,
  NarrativeNode,
  SectionKey,
  SectionOpenState,
  SerializedProjectData,
  SlipType
} from '../types/narrative'

const defaultSlipTypes: SlipType[] = [
  { id: 'blue', name: 'Blue Slip', color: '#3b82f6' },
  { id: 'red', name: 'Red Slip', color: '#ef4444' },
  { id: 'green', name: 'Green Slip', color: '#22c55e' },
  { id: 'yellow', name: 'Yellow Slip', color: '#eab308' }
]

const initialNodes: NarrativeNode[] = [
  {
    id: '1',
    type: 'narrativeCard',
    position: { x: 100, y: 100 },
    data: {
      code: 'AA01',
      title: 'Forest Arrival',
      summary:
        'The protagonist reaches the remote town after a long drive through the forest.',
      body:
        'The player arrives exhausted after driving through heavy rain. The town appears abandoned at first glance.',
      slipTypeId: 'blue',
      referencesText: 'AA02',
      puzzleType: 'none'
    }
  },
  {
    id: '2',
    type: 'narrativeCard',
    position: { x: 620, y: 320 },
    data: {
      code: 'AA02',
      title: 'Basement Discovery',
      summary:
        'A hidden ledger is discovered below the house during the investigation.',
      body:
        'The basement contains old financial records, coded names, and references to a hidden meeting place.',
      slipTypeId: 'red',
      referencesText: '',
      puzzleType: 'matching'
    }
  }
]

const initialSectionsOpen: SectionOpenState = {
  boardControls: true,
  slipManager: true,
  cardEditor: true
}

type NarrativeBoardState = {
  nodes: NarrativeNode[]
  edges: NarrativeEdge[]
  selectedNodeId: string | null
  slipTypes: SlipType[]
  sidebarCollapsed: boolean
  sectionsOpen: SectionOpenState
  connectionSourceNodeId: string | null
  contextPanelPosition: ContextPanelPosition
  minimapVisible: boolean
  minimapCollapsed: boolean
}

type NarrativeBoardActions = {
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addCard: () => void
  updateNode: (nodeId: string, patch: Partial<CardData>) => void
  createReferenceConnection: (sourceNodeId: string, targetNodeId: string) => void
  addSlipType: (name: string, color: string) => void
  exportProject: () => void
  setSelectedNode: (nodeId: string | null) => void
  clearSelection: () => void
  toggleSidebar: () => void
  toggleSection: (key: SectionKey) => void
  setContextPanelPosition: (position: ContextPanelPosition) => void
  setConnectionSourceNode: (nodeId: string | null) => void
  openFullEditor: () => void
  cycleMinimapState: () => void
}

export type NarrativeBoardStore = NarrativeBoardState & NarrativeBoardActions

function upsertReferenceText(currentText: string, codeToAdd: string): string {
  const refs = parseReferences(currentText)
  if (refs.includes(codeToAdd)) {
    return currentText
  }
  return [...refs, codeToAdd].join(', ')
}

function removeReferenceText(currentText: string, codeToRemove: string): string {
  return parseReferences(currentText)
    .filter((ref) => ref !== codeToRemove)
    .join(', ')
}

export function getSlipColor(slipTypes: SlipType[], slipTypeId: string): string {
  const slip = slipTypes.find((item) => item.id === slipTypeId)
  return slip ? slip.color : '#52525b'
}

export const useNarrativeBoardStore = create<NarrativeBoardStore>((set, get) => ({
  nodes: initialNodes,
  edges: buildEdgesFromReferences(initialNodes),
  selectedNodeId: '1',
  slipTypes: defaultSlipTypes,
  sidebarCollapsed: false,
  sectionsOpen: initialSectionsOpen,
  connectionSourceNodeId: null,
  contextPanelPosition: { x: 0, y: 0 },
  minimapVisible: true,
  minimapCollapsed: false,

  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes)
    }))
  },

  onEdgesChange: (changes) => {
    set((state) => {
      const removedIds = changes
        .filter((change) => change.type === 'remove')
        .map((change) => change.id)

      if (removedIds.length === 0) {
        return { edges: applyEdgeChanges(changes, state.edges) }
      }

      let updatedNodes = state.nodes
      removedIds.forEach((edgeId) => {
        const edge = state.edges.find((candidate) => candidate.id === edgeId)
        if (!edge) {
          return
        }

        const targetNode = state.nodes.find((node) => node.id === edge.target)
        if (!targetNode) {
          return
        }

        updatedNodes = updatedNodes.map((node) => {
          if (node.id !== edge.source) {
            return node
          }

          return {
            ...node,
            data: {
              ...node.data,
              referencesText: removeReferenceText(
                node.data.referencesText,
                targetNode.data.code
              )
            }
          }
        })
      })

      return {
        nodes: updatedNodes,
        edges: buildEdgesFromReferences(updatedNodes)
      }
    })
  },

  onConnect: (connection) => {
    if (!connection.source || !connection.target) {
      return
    }

    get().createReferenceConnection(connection.source, connection.target)
  },

  addCard: () => {
    set((state) => {
      const existingCodes = state.nodes.map((node) => node.data.code)
      const newCode = generateNextCode(existingCodes)
      const newNode: NarrativeNode = {
        id: crypto.randomUUID(),
        type: 'narrativeCard',
        position: {
          x: 260 + state.nodes.length * 40,
          y: 240 + state.nodes.length * 40
        },
        data: {
          code: newCode,
          title: 'New Fragment',
          summary: 'Brief narrative summary...',
          body: 'Expanded narrative content goes here...',
          slipTypeId: 'green',
          referencesText: '',
          puzzleType: 'none'
        }
      }

      return {
        nodes: [...state.nodes, newNode],
        selectedNodeId: newNode.id,
        contextPanelPosition: { x: 0, y: 0 }
      }
    })
  },

  updateNode: (nodeId, patch) => {
    set((state) => {
      const updatedNodes = state.nodes.map((node) => {
        if (node.id !== nodeId) {
          return node
        }

        return {
          ...node,
          data: {
            ...node.data,
            ...patch
          }
        }
      })

      return {
        nodes: updatedNodes,
        edges: buildEdgesFromReferences(updatedNodes)
      }
    })
  },

  createReferenceConnection: (sourceNodeId, targetNodeId) => {
    if (sourceNodeId === targetNodeId) {
      return
    }

    set((state) => {
      const sourceNode = state.nodes.find((node) => node.id === sourceNodeId)
      const targetNode = state.nodes.find((node) => node.id === targetNodeId)

      if (!sourceNode || !targetNode) {
        return state
      }

      const nextReferences = upsertReferenceText(
        sourceNode.data.referencesText,
        targetNode.data.code
      )

      if (nextReferences === sourceNode.data.referencesText) {
        return {
          connectionSourceNodeId: null
        }
      }

      const updatedNodes = state.nodes.map((node) => {
        if (node.id !== sourceNodeId) {
          return node
        }

        return {
          ...node,
          data: {
            ...node.data,
            referencesText: nextReferences
          }
        }
      })

      return {
        nodes: updatedNodes,
        edges: buildEdgesFromReferences(updatedNodes),
        connectionSourceNodeId: null
      }
    })
  },

  addSlipType: (name, color) => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      return
    }

    set((state) => ({
      slipTypes: [
        ...state.slipTypes,
        {
          id: crypto.randomUUID(),
          name: trimmedName,
          color
        }
      ]
    }))
  },

  exportProject: () => {
    if (typeof window === 'undefined') {
      return
    }

    const state = get()
    const projectData: SerializedProjectData = {
      nodes: state.nodes,
      edges: state.edges,
      slipTypes: state.slipTypes
    }

    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: 'application/json'
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'mystery-board.json'
    link.click()
    URL.revokeObjectURL(url)
  },

  setSelectedNode: (nodeId) => {
    set({ selectedNodeId: nodeId })
  },

  clearSelection: () => {
    set({
      selectedNodeId: null,
      connectionSourceNodeId: null
    })
  },

  toggleSidebar: () => {
    set((state) => ({
      sidebarCollapsed: !state.sidebarCollapsed
    }))
  },

  toggleSection: (key) => {
    set((state) => ({
      sectionsOpen: {
        ...state.sectionsOpen,
        [key]: !state.sectionsOpen[key]
      }
    }))
  },

  setContextPanelPosition: (position) => {
    set({ contextPanelPosition: position })
  },

  setConnectionSourceNode: (nodeId) => {
    set({ connectionSourceNodeId: nodeId })
  },

  openFullEditor: () => {
    set((state) => ({
      sidebarCollapsed: false,
      sectionsOpen: {
        ...state.sectionsOpen,
        cardEditor: true
      }
    }))
  },

  cycleMinimapState: () => {
    set((state) => {
      if (!state.minimapVisible) {
        return {
          minimapVisible: true,
          minimapCollapsed: false
        }
      }

      if (!state.minimapCollapsed) {
        return {
          minimapCollapsed: true
        }
      }

      return {
        minimapVisible: false
      }
    })
  }
}))
