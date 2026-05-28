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
import { createProjectFilename, serializeProject } from '../persistence/serializeProject'
import { deserializeProject } from '../persistence/deserializeProject'
import { importAIFormat } from '../ai/importAIFormat'
import type {
  CardData,
  NarrativeEdge,
  NarrativeNode,
  SectionKey,
  SectionOpenState,
  SerializedMetadata,
  SerializedProjectData,
  SerializedViewport,
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
  minimapVisible: boolean
  minimapCollapsed: boolean
  metadata: SerializedMetadata
  viewport: SerializedViewport
  hasUnsavedChanges: boolean
  contextPanelOpen: boolean
  canUndo: boolean
  canRedo: boolean
  historyPast: HistorySnapshot[]
  historyFuture: HistorySnapshot[]
}

type HistorySnapshot = {
  nodes: NarrativeNode[]
  edges: NarrativeEdge[]
  selectedNodeId: string | null
  slipTypes: SlipType[]
  metadata: SerializedMetadata
  viewport: SerializedViewport
  hasUnsavedChanges: boolean
}

type NarrativeBoardActions = {
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addCard: () => void
  deleteCard: (nodeId: string) => void
  updateNode: (nodeId: string, patch: Partial<CardData>) => void
  createReferenceConnection: (sourceNodeId: string, targetNodeId: string) => void
  addSlipType: (name: string, color: string) => void
  saveProject: () => Promise<void>
  loadProject: (file: File) => Promise<void>
  applyAIFormatImport: (rawText: string) => Promise<{ createdCount: number; updatedCount: number }>
  setSelectedNode: (nodeId: string | null) => void
  clearSelection: () => void
  toggleSidebar: () => void
  toggleSection: (key: SectionKey) => void
  setConnectionSourceNode: (nodeId: string | null) => void
  openFullEditor: () => void
  openContextPanel: () => void
  closeContextPanel: () => void
  cycleMinimapState: () => void
  setViewport: (viewport: SerializedViewport) => void
  setMetadata: (metadata: SerializedMetadata) => void
  undo: () => void
  redo: () => void
}

export type NarrativeBoardStore = NarrativeBoardState & NarrativeBoardActions

function createSnapshot(state: NarrativeBoardState): HistorySnapshot {
  return {
    nodes: state.nodes.map((node) => ({ ...node, data: { ...node.data }, position: { ...node.position } })),
    edges: state.edges.map((edge) => ({ ...edge })),
    selectedNodeId: state.selectedNodeId,
    slipTypes: state.slipTypes.map((slip) => ({ ...slip })),
    metadata: { ...state.metadata },
    viewport: { ...state.viewport },
    hasUnsavedChanges: state.hasUnsavedChanges
  }
}

function toggleReferenceText(currentText: string, code: string): string {
  const refs = parseReferences(currentText)
  if (refs.includes(code)) {
    return refs.filter((ref) => ref !== code).join(', ')
  }
  return [...refs, code].join(', ')
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
  minimapVisible: true,
  minimapCollapsed: false,
  contextPanelOpen: false,
  canUndo: false,
  canRedo: false,
  historyPast: [],
  historyFuture: [],
  metadata: {
    projectName: 'Mystery Board',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  viewport: { x: 0, y: 0, zoom: 1 },
  hasUnsavedChanges: false,

  onNodesChange: (changes) => {
    set((state) => ({
      historyPast: [...state.historyPast, createSnapshot(state)],
      historyFuture: [],
      canUndo: true,
      canRedo: false,
      nodes: applyNodeChanges(changes, state.nodes),
      hasUnsavedChanges: true
    }))
  },

  onEdgesChange: (changes) => {
    set((state) => {
      const removedIds = changes
        .filter((change) => change.type === 'remove')
        .map((change) => change.id)

      if (removedIds.length === 0) {
        return {
          historyPast: [...state.historyPast, createSnapshot(state)],
          historyFuture: [],
          canUndo: true,
          canRedo: false,
          edges: applyEdgeChanges(changes, state.edges),
          hasUnsavedChanges: true
        }
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
        historyPast: [...state.historyPast, createSnapshot(state)],
        historyFuture: [],
        canUndo: true,
        canRedo: false,
        nodes: updatedNodes,
        edges: buildEdgesFromReferences(updatedNodes),
        hasUnsavedChanges: true
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
        historyPast: [...state.historyPast, createSnapshot(state)],
        historyFuture: [],
        canUndo: true,
        canRedo: false,
        nodes: [...state.nodes, newNode],
        selectedNodeId: newNode.id,
        hasUnsavedChanges: true
      }
    })
  },

  deleteCard: (nodeId) => {
    set((state) => {
      const nodeToDelete = state.nodes.find((node) => node.id === nodeId)
      if (!nodeToDelete) {
        return state
      }

      const nextNodes = state.nodes
        .filter((node) => node.id !== nodeId)
        .map((node) => ({
          ...node,
          data: {
            ...node.data,
            referencesText: removeReferenceText(node.data.referencesText, nodeToDelete.data.code)
          }
        }))

      const nextSelectedNodeId =
        state.selectedNodeId === nodeId ? nextNodes[0]?.id ?? null : state.selectedNodeId

      return {
        historyPast: [...state.historyPast, createSnapshot(state)],
        historyFuture: [],
        canUndo: true,
        canRedo: false,
        nodes: nextNodes,
        edges: buildEdgesFromReferences(nextNodes),
        selectedNodeId: nextSelectedNodeId,
        connectionSourceNodeId:
          state.connectionSourceNodeId === nodeId ? null : state.connectionSourceNodeId,
        contextPanelOpen: state.selectedNodeId === nodeId ? false : state.contextPanelOpen,
        hasUnsavedChanges: true
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
        historyPast: [...state.historyPast, createSnapshot(state)],
        historyFuture: [],
        canUndo: true,
        canRedo: false,
        nodes: updatedNodes,
        edges: buildEdgesFromReferences(updatedNodes),
        hasUnsavedChanges: true
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

      const nextReferences = toggleReferenceText(
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
        historyPast: [...state.historyPast, createSnapshot(state)],
        historyFuture: [],
        canUndo: true,
        canRedo: false,
        nodes: updatedNodes,
        edges: buildEdgesFromReferences(updatedNodes),
        connectionSourceNodeId: null,
        hasUnsavedChanges: true
      }
    })
  },

  addSlipType: (name, color) => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      return
    }

    set((state) => ({
      historyPast: [...state.historyPast, createSnapshot(state)],
      historyFuture: [],
      canUndo: true,
      canRedo: false,
      slipTypes: [
        ...state.slipTypes,
        {
          id: crypto.randomUUID(),
          name: trimmedName,
          color
        }
      ],
      hasUnsavedChanges: true
    }))
  },

  saveProject: async () => {
    if (typeof window === 'undefined') {
      return
    }

    const state = get()
    const updatedAt = new Date().toISOString()
    const projectData: SerializedProjectData = serializeProject({
      nodes: state.nodes,
      slipTypes: state.slipTypes,
      viewport: state.viewport,
      metadata: {
        projectName: state.metadata.projectName,
        createdAt: state.metadata.createdAt,
        updatedAt
      }
    })

    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: 'application/json'
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = createProjectFilename('mystery-board')
    link.click()
    URL.revokeObjectURL(url)

    set({
      metadata: {
        ...state.metadata,
        updatedAt
      },
      hasUnsavedChanges: false
    })
  },

  loadProject: async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.json')) {
      throw new Error('Please select a .json project file.')
    }

    const text = await file.text()

    if (get().hasUnsavedChanges && !window.confirm('Replace the current board with this project file? Unsaved changes will be lost.')) {
      return
    }

    try {
      const project = deserializeProject(text)
      const nextNodes = project.nodes.map((node) => ({ ...node }))
      const nextEdges = buildEdgesFromReferences(nextNodes)

      set({
        nodes: nextNodes,
        edges: nextEdges,
        slipTypes: project.slipTypes.map((item) => ({ ...item })),
        metadata: {
          projectName: project.metadata.projectName || 'Mystery Board',
          createdAt: project.metadata.createdAt || new Date().toISOString(),
          updatedAt: project.metadata.updatedAt || new Date().toISOString()
        },
        viewport: project.viewport || { x: 0, y: 0, zoom: 1 },
        selectedNodeId: nextNodes[0]?.id ?? null,
        connectionSourceNodeId: null,
        historyPast: [],
        historyFuture: [],
        canUndo: false,
        canRedo: false,
        hasUnsavedChanges: false
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The project file could not be loaded.'
      throw new Error(message, { cause: error })
    }
  },

  applyAIFormatImport: async (rawText) => {
    const state = get()

    try {
      const result = importAIFormat(rawText, state.nodes, state.slipTypes)

      set({
        historyPast: [...state.historyPast, createSnapshot(state)],
        historyFuture: [],
        canUndo: true,
        canRedo: false,
        nodes: result.updatedNodes,
        edges: result.updatedEdges,
        selectedNodeId: result.updatedNodes[0]?.id ?? null,
        hasUnsavedChanges: true
      })

      return {
        createdCount: result.createdCount,
        updatedCount: result.updatedCount
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to import the AI format.'
      throw new Error(message, { cause: error })
    }
  },

  setSelectedNode: (nodeId) => {
    set({ selectedNodeId: nodeId })
  },

  clearSelection: () => {
    set({
      selectedNodeId: null,
      connectionSourceNodeId: null,
      contextPanelOpen: false
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


  setConnectionSourceNode: (nodeId) => {
    set({ connectionSourceNodeId: nodeId })
  },

  setViewport: (viewport) => {
    set((state) => ({
      historyPast: [...state.historyPast, createSnapshot(state)],
      historyFuture: [],
      canUndo: true,
      canRedo: false,
      viewport,
      hasUnsavedChanges: true
    }))
  },

  setMetadata: (metadata) => {
    set((state) => ({
      historyPast: [...state.historyPast, createSnapshot(state)],
      historyFuture: [],
      canUndo: true,
      canRedo: false,
      metadata,
      hasUnsavedChanges: true
    }))
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

  openContextPanel: () => {
    set({ contextPanelOpen: true })
  },

  closeContextPanel: () => {
    set({ contextPanelOpen: false })
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

  ,
  undo: () => {
    set((state) => {
      const previous = state.historyPast[state.historyPast.length - 1]
      if (!previous) {
        return state
      }

      const nextFuture = [createSnapshot(state), ...state.historyFuture]
      const nextPast = state.historyPast.slice(0, -1)

      return {
        ...previous,
        historyPast: nextPast,
        historyFuture: nextFuture,
        canUndo: nextPast.length > 0,
        canRedo: true,
        connectionSourceNodeId: null,
        contextPanelOpen: false
      }
    })
  },

  redo: () => {
    set((state) => {
      const next = state.historyFuture[0]
      if (!next) {
        return state
      }

      const nextPast = [...state.historyPast, createSnapshot(state)]
      const nextFuture = state.historyFuture.slice(1)

      return {
        ...next,
        historyPast: nextPast,
        historyFuture: nextFuture,
        canUndo: true,
        canRedo: nextFuture.length > 0,
        connectionSourceNodeId: null,
        contextPanelOpen: false
      }
    })
  }
}))
