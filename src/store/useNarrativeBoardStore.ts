import { create } from 'zustand'

export type EditorField = 'codeRefs' | 'title' | 'summary' | 'slipType' | 'slipGiven' | 'tags' | 'puzzleType' | null
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
  CardGroup,
  CardData,
  MatchingCard,
  NarrativeEdge,
  NarrativeNode,
  SectionKey,
  SectionOpenState,
  SerializedMetadata,
  SerializedProjectData,
  SerializedViewport,
  SlipType,
  Tag
} from '../types/narrative'

const defaultSlipTypes: SlipType[] = [
  { id: 'blue', name: 'Blue Slip', color: '#3b82f6' },
  { id: 'red', name: 'Red Slip', color: '#ef4444' },
  { id: 'green', name: 'Green Slip', color: '#22c55e' },
  { id: 'yellow', name: 'Yellow Slip', color: '#eab308' }
]

const defaultTags: Tag[] = []

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
      slipGivenTypeIds: [],
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
      slipGivenTypeIds: [],
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
  /** Per-edge middle-segment offsets, keyed by edge id. Survives edge regeneration. (Dormant feature.) */
  edgeShapes: Record<string, number>
  /** Per-edge A*-routed polylines (flow coords), keyed by edge id. Empty until "Tidy lines" runs. */
  routedPaths: Record<string, { x: number; y: number }[]>
  /** Per-edge stroke color derived from source node identity, keyed by edge id. */
  edgeColors: Record<string, string>
  /**
   * When true, connectors leaving a common card share a fanned exit + trunk
   * before branching (flow-chart bundling). Default on; no visible toggle, but
   * exposed in state so it can be flipped off. See setBundleEdges.
   */
  bundleEdges: boolean
  selectedNodeId: string | null
  selectedNodeIds: string[]
  groups: CardGroup[]
  slipTypes: SlipType[]
  tags: Tag[]
  sidebarCollapsed: boolean
  sectionsOpen: SectionOpenState
  connectionSourceNodeId: string | null
  linkMode: boolean
  minimapVisible: boolean
  minimapCollapsed: boolean
  metadata: SerializedMetadata
  viewport: SerializedViewport
  hasUnsavedChanges: boolean
  contextPanelOpen: boolean
  narrativeBodyOpen: boolean
  puzzleBodyOpen: boolean
  activeEditorField: EditorField
  canUndo: boolean
  canRedo: boolean
  historyPast: HistorySnapshot[]
  historyFuture: HistorySnapshot[]
  multiSelectMode: boolean
  highlightedNodeIds: string[]
  activeGroupId: string | null
  matchingPickMode: boolean
  matchingPickSourceNodeId: string | null
  matchingPickStagedIds: string[]
}

type HistorySnapshot = {
  nodes: NarrativeNode[]
  edges: NarrativeEdge[]
  edgeShapes: Record<string, number>
  selectedNodeId: string | null
  selectedNodeIds: string[]
  groups: CardGroup[]
  slipTypes: SlipType[]
  tags: Tag[]
  metadata: SerializedMetadata
  viewport: SerializedViewport
  hasUnsavedChanges: boolean
}

type NarrativeBoardActions = {
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  setEdgeOffset: (edgeId: string, offset: number) => void
  setRoutedPaths: (paths: Record<string, { x: number; y: number }[]>) => void
  clearRoutedPaths: () => void
  setEdgeColors: (colors: Record<string, string>) => void
  setBundleEdges: (enabled: boolean) => void
  addCard: () => void
  deleteCard: (nodeId: string) => void
  updateNode: (nodeId: string, patch: Partial<CardData>) => void
  createReferenceConnection: (sourceNodeId: string, targetNodeId: string) => void
  addSlipType: (name: string, color: string) => void
  renameSlipType: (id: string, name: string) => void
  deleteSlipType: (id: string) => void
  addTag: (name: string) => void
  renameTag: (id: string, name: string) => void
  deleteTag: (id: string) => void
  assignTagToNode: (nodeId: string, tagId: string) => void
  unassignTagFromNode: (nodeId: string, tagId: string) => void
  createGroupFromSelection: (name: string) => void
  toggleSelectionInGroup: (groupId: string) => void
  selectGroup: (groupId: string) => void
  deleteGroup: (groupId: string) => void
  saveProject: () => Promise<void>
  loadProject: (file: File) => Promise<void>
  applyAIFormatImport: (rawText: string) => Promise<{ createdCount: number; updatedCount: number }>
  setSelectedNode: (nodeId: string | null) => void
  setSelectedNodes: (nodeIds: string[], primaryNodeId?: string | null) => void
  toggleNodeSelection: (nodeId: string) => void
  clearSelection: () => void
  toggleSidebar: () => void
  toggleSection: (key: SectionKey) => void
  setConnectionSourceNode: (nodeId: string | null) => void
  setLinkMode: (enabled: boolean) => void
  openFullEditor: () => void
  openContextPanel: () => void
  closeContextPanel: () => void
  openNarrativeBody: () => void
  closeNarrativeBody: () => void
  openPuzzleBody: () => void
  closePuzzleBody: () => void
  openEditorField: (field: EditorField) => void
  closeEditorField: () => void
  cycleMinimapState: () => void
  setViewport: (viewport: SerializedViewport) => void
  setMetadata: (metadata: SerializedMetadata) => void
  undo: () => void
  redo: () => void
  deleteSelectedCards: () => void
  setMultiSelectMode: (enabled: boolean) => void
  setHighlight: (nodeIds: string[]) => void
  clearHighlight: () => void
  enterMatchingPickMode: (sourceNodeId: string) => void
  confirmMatchingPick: (pickedNodeId: string) => void
  cancelMatchingPickMode: () => void
  commitMatchingPickMode: () => void
}

export type NarrativeBoardStore = NarrativeBoardState & NarrativeBoardActions

/**
 * Edges are regenerated from referencesText on every change, so the persistent
 * per-edge segment offsets (keyed by edge id) must be merged back in each time.
 */
type EdgeShapeMap = Record<string, number>

function buildEdges(nodes: NarrativeNode[], edgeShapes: EdgeShapeMap): NarrativeEdge[] {
  return buildEdgesFromReferences(nodes).map((edge) => {
    const offset = edgeShapes[edge.id]
    if (typeof offset !== 'number') {
      return edge
    }
    return { ...edge, data: { ...edge.data, manualOffset: offset } }
  })
}

function createSnapshot(state: NarrativeBoardState): HistorySnapshot {
  return {
    nodes: state.nodes.map((node) => ({ ...node, data: { ...node.data }, position: { ...node.position } })),
    edges: state.edges.map((edge) => ({ ...edge })),
    edgeShapes: { ...state.edgeShapes },
    selectedNodeId: state.selectedNodeId,
    selectedNodeIds: [...state.selectedNodeIds],
    groups: state.groups.map((group) => ({ ...group, nodeIds: [...group.nodeIds] })),
    slipTypes: state.slipTypes.map((slip) => ({ ...slip })),
    tags: state.tags.map((tag) => ({ ...tag })),
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

function dedupeNodeIds(nodeIds: string[], nodes: NarrativeNode[]): string[] {
  const validIds = new Set(nodes.map((node) => node.id))
  return [...new Set(nodeIds)].filter((nodeId) => validIds.has(nodeId))
}

function normalizeGroups(groups: CardGroup[], nodes: NarrativeNode[]): CardGroup[] {
  return groups.map((group) => ({
    ...group,
    nodeIds: dedupeNodeIds(group.nodeIds, nodes)
  }))
}

function getSelectionState(
  nodes: NarrativeNode[],
  nodeIds: string[],
  primaryNodeId?: string | null
) {
  const selectedNodeIds = dedupeNodeIds(nodeIds, nodes)
  const nextPrimaryId = primaryNodeId && selectedNodeIds.includes(primaryNodeId)
    ? primaryNodeId
    : selectedNodeIds[0] ?? null

  return {
    selectedNodeIds,
    selectedNodeId: nextPrimaryId
  }
}

function removeNodesByIds(state: NarrativeBoardState, nodeIds: string[]) {
  const idsToDelete = new Set(nodeIds)
  if (idsToDelete.size === 0) {
    return null
  }

  const nodesToDelete = state.nodes.filter((node) => idsToDelete.has(node.id))
  if (nodesToDelete.length === 0) {
    return null
  }

  const codesToDelete = new Set(nodesToDelete.map((node) => node.data.code))
  const nextNodes = state.nodes
    .filter((node) => !idsToDelete.has(node.id))
    .map((node) => ({
      ...node,
      data: {
        ...node.data,
        referencesText: parseReferences(node.data.referencesText)
          .filter((ref) => !codesToDelete.has(ref))
          .join(', ')
      }
    }))

  const nextSelection = getSelectionState(
    nextNodes,
    state.selectedNodeIds.filter((selectedId) => !idsToDelete.has(selectedId)),
    state.selectedNodeId && !idsToDelete.has(state.selectedNodeId) ? state.selectedNodeId : null
  )

  const activeSelectionDeleted =
    state.selectedNodeIds.some((selectedId) => idsToDelete.has(selectedId)) ||
    (state.selectedNodeId ? idsToDelete.has(state.selectedNodeId) : false)

  return {
    nodes: nextNodes,
    edges: buildEdges(nextNodes, state.edgeShapes),
    groups: normalizeGroups(state.groups, nextNodes),
    ...nextSelection,
    connectionSourceNodeId:
      state.connectionSourceNodeId && idsToDelete.has(state.connectionSourceNodeId)
        ? null
        : state.connectionSourceNodeId,
    contextPanelOpen: activeSelectionDeleted && nextSelection.selectedNodeIds.length !== 1
      ? false
      : state.contextPanelOpen,
    narrativeBodyOpen: activeSelectionDeleted && nextSelection.selectedNodeIds.length !== 1
      ? false
      : state.narrativeBodyOpen,
    puzzleBodyOpen: activeSelectionDeleted && nextSelection.selectedNodeIds.length !== 1
      ? false
      : state.puzzleBodyOpen,
    activeEditorField: activeSelectionDeleted && nextSelection.selectedNodeIds.length !== 1
      ? null
      : state.activeEditorField
  }
}

export function getSlipColor(slipTypes: SlipType[], slipTypeId: string): string {
  const slip = slipTypes.find((item) => item.id === slipTypeId)
  return slip ? slip.color : '#52525b'
}

export const useNarrativeBoardStore = create<NarrativeBoardStore>((set, get) => ({
  nodes: initialNodes,
  edges: buildEdgesFromReferences(initialNodes),
  edgeShapes: {},
  routedPaths: {},
  edgeColors: {},
  bundleEdges: true,
  selectedNodeId: '1',
  selectedNodeIds: ['1'],
  groups: [],
  slipTypes: defaultSlipTypes,
  tags: defaultTags,
  sidebarCollapsed: false,
  sectionsOpen: initialSectionsOpen,
  connectionSourceNodeId: null,
  linkMode: false,
  minimapVisible: true,
  minimapCollapsed: false,
  contextPanelOpen: false,
  narrativeBodyOpen: false,
  puzzleBodyOpen: false,
  activeEditorField: null,
  canUndo: false,
  canRedo: false,
  historyPast: [],
  historyFuture: [],
  multiSelectMode: false,
  highlightedNodeIds: [],
  activeGroupId: null,
  matchingPickMode: false,
  matchingPickSourceNodeId: null,
  matchingPickStagedIds: [],
  metadata: {
    projectName: 'Mystery Board',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  viewport: { x: 0, y: 0, zoom: 1 },
  hasUnsavedChanges: false,

  onNodesChange: (changes) => {
    set((state) => {
      const nextNodes = applyNodeChanges(changes, state.nodes)

      // Invalidate A*-routed paths only for edges touching a node that actually
      // *moved* (position changed), so those lines fall back to the live floating
      // elbow and track the card. A bare select/click emits a position change
      // with unchanged coordinates — we ignore those so selecting a card doesn't
      // reset its lines. Edges not connected to a moved card keep their routed
      // shape; A* re-applies on the next manual "Tidy Lines".
      const movedNodeIds = new Set(
        changes
          .filter((change): change is NodeChange & { id: string; position?: { x: number; y: number } } => {
            if (change.type !== 'position') return false
            const pos = (change as { position?: { x: number; y: number } }).position
            if (!pos) return false
            const node = state.nodes.find((n) => n.id === (change as { id: string }).id)
            if (!node) return true
            return pos.x !== node.position.x || pos.y !== node.position.y
          })
          .map((change) => change.id)
      )
      let routedPaths = state.routedPaths
      if (movedNodeIds.size > 0 && Object.keys(routedPaths).length > 0) {
        const next: Record<string, { x: number; y: number }[]> = {}
        for (const edge of state.edges) {
          if (movedNodeIds.has(edge.source) || movedNodeIds.has(edge.target)) continue
          if (routedPaths[edge.id]) next[edge.id] = routedPaths[edge.id]
        }
        routedPaths = next
      }

      return {
        historyPast: [...state.historyPast, createSnapshot(state)],
        historyFuture: [],
        canUndo: true,
        canRedo: false,
        nodes: nextNodes,
        groups: normalizeGroups(state.groups, nextNodes),
        routedPaths,
        hasUnsavedChanges: true
      }
    })
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
              ),
              referenceSlipForms: (node.data.referenceSlipForms ?? []).filter(
                (code) => code !== targetNode.data.code
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
        edges: buildEdges(updatedNodes, state.edgeShapes),
        groups: normalizeGroups(state.groups, updatedNodes),
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

  setEdgeOffset: (edgeId, offset) => {
    set((state) => {
      const edgeShapes = { ...state.edgeShapes, [edgeId]: offset }
      return {
        edgeShapes,
        edges: state.edges.map((edge) =>
          edge.id === edgeId
            ? { ...edge, data: { ...edge.data, manualOffset: offset } }
            : edge
        ),
        hasUnsavedChanges: true
      }
    })
  },

  setRoutedPaths: (paths) => {
    set({ routedPaths: paths })
  },

  clearRoutedPaths: () => {
    set((state) =>
      Object.keys(state.routedPaths).length === 0 ? state : { routedPaths: {} }
    )
  },

  setEdgeColors: (colors) => {
    set({ edgeColors: colors })
  },

  setBundleEdges: (enabled) => {
    set((state) => (state.bundleEdges === enabled ? state : { bundleEdges: enabled }))
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
          slipGivenTypeIds: [],
          referencesText: '',
          referenceSlipForms: [],
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
        selectedNodeIds: [newNode.id],
        hasUnsavedChanges: true
      }
    })
  },

  deleteCard: (nodeId) => {
    set((state) => {
      const nextState = removeNodesByIds(state, [nodeId])
      if (!nextState) {
        return state
      }

      return {
        historyPast: [...state.historyPast, createSnapshot(state)],
        historyFuture: [],
        canUndo: true,
        canRedo: false,
        ...nextState,
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
        edges: buildEdges(updatedNodes, state.edgeShapes),
        groups: normalizeGroups(state.groups, updatedNodes),
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
        edges: buildEdges(updatedNodes, state.edgeShapes),
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

  renameSlipType: (id, name) => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      return
    }

    set((state) => ({
      historyPast: [...state.historyPast, createSnapshot(state)],
      historyFuture: [],
      canUndo: true,
      canRedo: false,
      slipTypes: state.slipTypes.map((slip) =>
        slip.id === id ? { ...slip, name: trimmedName } : slip
      ),
      hasUnsavedChanges: true
    }))
  },

  deleteSlipType: (id) => {
    set((state) => {
      if (!state.slipTypes.some((slip) => slip.id === id)) {
        return state
      }

      const fallbackId = state.slipTypes.find((slip) => slip.id !== id)?.id ?? ''
      const updatedNodes = state.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          slipTypeId: node.data.slipTypeId === id ? fallbackId : node.data.slipTypeId,
          slipGivenTypeIds: node.data.slipGivenTypeIds.filter((sid) => sid !== id)
        }
      }))

      return {
        historyPast: [...state.historyPast, createSnapshot(state)],
        historyFuture: [],
        canUndo: true,
        canRedo: false,
        slipTypes: state.slipTypes.filter((slip) => slip.id !== id),
        nodes: updatedNodes,
        edges: buildEdges(updatedNodes, state.edgeShapes),
        hasUnsavedChanges: true
      }
    })
  },

  addTag: (name) => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      return
    }

    set((state) => {
      if (state.tags.some((tag) => tag.name.toLowerCase() === trimmedName.toLowerCase())) {
        return state
      }

      return {
        historyPast: [...state.historyPast, createSnapshot(state)],
        historyFuture: [],
        canUndo: true,
        canRedo: false,
        tags: [...state.tags, { id: crypto.randomUUID(), name: trimmedName }],
        hasUnsavedChanges: true
      }
    })
  },

  renameTag: (id, name) => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      return
    }

    set((state) => ({
      historyPast: [...state.historyPast, createSnapshot(state)],
      historyFuture: [],
      canUndo: true,
      canRedo: false,
      tags: state.tags.map((tag) => (tag.id === id ? { ...tag, name: trimmedName } : tag)),
      hasUnsavedChanges: true
    }))
  },

  deleteTag: (id) => {
    set((state) => {
      if (!state.tags.some((tag) => tag.id === id)) {
        return state
      }

      const updatedNodes = state.nodes.map((node) =>
        (node.data.tagIds ?? []).includes(id)
          ? { ...node, data: { ...node.data, tagIds: (node.data.tagIds ?? []).filter((tid) => tid !== id) } }
          : node
      )

      return {
        historyPast: [...state.historyPast, createSnapshot(state)],
        historyFuture: [],
        canUndo: true,
        canRedo: false,
        tags: state.tags.filter((tag) => tag.id !== id),
        nodes: updatedNodes,
        hasUnsavedChanges: true
      }
    })
  },

  assignTagToNode: (nodeId, tagId) => {
    set((state) => {
      const node = state.nodes.find((n) => n.id === nodeId)
      if (!node || (node.data.tagIds ?? []).includes(tagId)) {
        return state
      }

      return {
        historyPast: [...state.historyPast, createSnapshot(state)],
        historyFuture: [],
        canUndo: true,
        canRedo: false,
        nodes: state.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, tagIds: [...(n.data.tagIds ?? []), tagId] } }
            : n
        ),
        hasUnsavedChanges: true
      }
    })
  },

  unassignTagFromNode: (nodeId, tagId) => {
    set((state) => {
      const node = state.nodes.find((n) => n.id === nodeId)
      if (!node || !(node.data.tagIds ?? []).includes(tagId)) {
        return state
      }

      return {
        historyPast: [...state.historyPast, createSnapshot(state)],
        historyFuture: [],
        canUndo: true,
        canRedo: false,
        nodes: state.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, tagIds: (n.data.tagIds ?? []).filter((tid) => tid !== tagId) } }
            : n
        ),
        hasUnsavedChanges: true
      }
    })
  },

  createGroupFromSelection: (name) => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      return
    }

    set((state) => {
      if (state.selectedNodeIds.length < 2) {
        return state
      }

      return {
        historyPast: [...state.historyPast, createSnapshot(state)],
        historyFuture: [],
        canUndo: true,
        canRedo: false,
        groups: [
          ...state.groups,
          {
            id: crypto.randomUUID(),
            name: trimmedName,
            nodeIds: [...state.selectedNodeIds]
          }
        ],
        hasUnsavedChanges: true
      }
    })
  },

  toggleSelectionInGroup: (groupId) => {
    set((state) => {
      if (state.selectedNodeIds.length < 2) {
        return state
      }

      const group = state.groups.find((entry) => entry.id === groupId)
      if (!group) {
        return state
      }

      const selectedSet = new Set(state.selectedNodeIds)
      const allSelectedAlreadyInGroup = state.selectedNodeIds.every((nodeId) => group.nodeIds.includes(nodeId))
      const nextGroups = state.groups.map((entry) => {
        if (entry.id !== groupId) {
          return entry
        }

        const nextNodeIds = allSelectedAlreadyInGroup
          ? entry.nodeIds.filter((nodeId) => !selectedSet.has(nodeId))
          : [...new Set([...entry.nodeIds, ...state.selectedNodeIds])]

        return {
          ...entry,
          nodeIds: nextNodeIds
        }
      })

      return {
        historyPast: [...state.historyPast, createSnapshot(state)],
        historyFuture: [],
        canUndo: true,
        canRedo: false,
        groups: normalizeGroups(nextGroups, state.nodes),
        hasUnsavedChanges: true
      }
    })
  },

  selectGroup: (groupId) => {
    set((state) => {
      const group = state.groups.find((entry) => entry.id === groupId)
      if (!group) {
        return state
      }

      const nextSelection = getSelectionState(state.nodes, group.nodeIds, group.nodeIds[0] ?? null)
      return {
        ...nextSelection,
        contextPanelOpen: false,
        narrativeBodyOpen: false,
        puzzleBodyOpen: false,
        activeEditorField: null,
        multiSelectMode: false,
        activeGroupId: groupId
      }
    })
  },

  deleteGroup: (groupId) => {
    set((state) => {
      if (!state.groups.some((group) => group.id === groupId)) {
        return state
      }

      return {
        historyPast: [...state.historyPast, createSnapshot(state)],
        historyFuture: [],
        canUndo: true,
        canRedo: false,
        groups: state.groups.filter((group) => group.id !== groupId),
        hasUnsavedChanges: true,
        activeGroupId: state.activeGroupId === groupId ? null : state.activeGroupId
      }
    })
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
      tags: state.tags,
      groups: state.groups,
      viewport: state.viewport,
      edgeShapes: state.edgeShapes,
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
      const nextEdgeShapes: Record<string, number> =
        (project.edgeShapes as Record<string, number> | undefined) ?? {}
      const nextEdges = buildEdges(nextNodes, nextEdgeShapes)

      set({
        nodes: nextNodes,
        edges: nextEdges,
        edgeShapes: nextEdgeShapes,
        slipTypes: project.slipTypes.map((item) => ({ ...item })),
        tags: project.tags.map((item) => ({ ...item })),
        groups: normalizeGroups(project.groups.map((group) => ({ ...group, nodeIds: [...group.nodeIds] })), nextNodes),
        metadata: {
          projectName: project.metadata.projectName || 'Mystery Board',
          createdAt: project.metadata.createdAt || new Date().toISOString(),
          updatedAt: project.metadata.updatedAt || new Date().toISOString()
        },
        viewport: project.viewport || { x: 0, y: 0, zoom: 1 },
        selectedNodeId: nextNodes[0]?.id ?? null,
        selectedNodeIds: nextNodes[0]?.id ? [nextNodes[0].id] : [],
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
      const result = importAIFormat(rawText, state.nodes, state.slipTypes, state.tags)

      set({
        historyPast: [...state.historyPast, createSnapshot(state)],
        historyFuture: [],
        canUndo: true,
        canRedo: false,
        nodes: result.updatedNodes,
        edges: result.updatedEdges,
        tags: result.updatedTags,
        groups: normalizeGroups(state.groups, result.updatedNodes),
        selectedNodeId: result.updatedNodes[0]?.id ?? null,
        selectedNodeIds: result.updatedNodes[0]?.id ? [result.updatedNodes[0].id] : [],
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
    set((state) => ({
      ...getSelectionState(state.nodes, nodeId ? [nodeId] : [], nodeId),
      contextPanelOpen: nodeId ? state.contextPanelOpen : false,
      narrativeBodyOpen: nodeId ? state.narrativeBodyOpen : false,
      puzzleBodyOpen: nodeId ? state.puzzleBodyOpen : false,
      activeEditorField: nodeId ? state.activeEditorField : null,
      activeGroupId: null
    }))
  },

  setSelectedNodes: (nodeIds, primaryNodeId = null) => {
    set((state) => {
      const nextSelection = getSelectionState(state.nodes, nodeIds, primaryNodeId)
      const hasSingleSelection = nextSelection.selectedNodeIds.length === 1

      return {
        ...nextSelection,
        contextPanelOpen: hasSingleSelection ? state.contextPanelOpen : false,
        narrativeBodyOpen: hasSingleSelection ? state.narrativeBodyOpen : false,
        puzzleBodyOpen: hasSingleSelection ? state.puzzleBodyOpen : false,
        activeEditorField: hasSingleSelection ? state.activeEditorField : null
      }
    })
  },

  toggleNodeSelection: (nodeId) => {
    set((state) => {
      const alreadySelected = state.selectedNodeIds.includes(nodeId)
      const nextIds = alreadySelected
        ? state.selectedNodeIds.filter((selectedId) => selectedId !== nodeId)
        : [...state.selectedNodeIds, nodeId]
      const nextSelection = getSelectionState(
        state.nodes,
        nextIds,
        alreadySelected ? state.selectedNodeId : nodeId
      )
      const hasSingleSelection = nextSelection.selectedNodeIds.length === 1

      return {
        ...nextSelection,
        contextPanelOpen: hasSingleSelection ? state.contextPanelOpen : false,
        narrativeBodyOpen: hasSingleSelection ? state.narrativeBodyOpen : false,
        puzzleBodyOpen: hasSingleSelection ? state.puzzleBodyOpen : false,
        activeEditorField: hasSingleSelection ? state.activeEditorField : null,
        activeGroupId: null
      }
    })
  },

  clearSelection: () => {
    set({
      selectedNodeId: null,
      selectedNodeIds: [],
      connectionSourceNodeId: null,
      contextPanelOpen: false,
      narrativeBodyOpen: false,
      puzzleBodyOpen: false,
      activeEditorField: null,
      activeGroupId: null
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

  setLinkMode: (enabled) => {
    set({ linkMode: enabled, connectionSourceNodeId: null })
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
    set((state) => ({
      contextPanelOpen: state.selectedNodeIds.length === 1
    }))
  },

  closeContextPanel: () => {
    set({ contextPanelOpen: false })
  },

  openNarrativeBody: () => {
    set((state) => ({
      narrativeBodyOpen: state.selectedNodeIds.length === 1,
      puzzleBodyOpen: false
    }))
  },

  closeNarrativeBody: () => {
    set({ narrativeBodyOpen: false })
  },

  openPuzzleBody: () => {
    set((state) => ({
      puzzleBodyOpen: state.selectedNodeIds.length === 1,
      narrativeBodyOpen: false
    }))
  },

  closePuzzleBody: () => {
    set({ puzzleBodyOpen: false })
  },

  openEditorField: (field) => {
    set((state) => ({
      activeEditorField: state.selectedNodeIds.length === 1 ? field : null
    }))
  },

  closeEditorField: () => {
    set({ activeEditorField: null })
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
  deleteSelectedCards: () => {
    set((state) => {
      const nextState = removeNodesByIds(state, state.selectedNodeIds)
      if (!nextState) {
        return state
      }

      return {
        historyPast: [...state.historyPast, createSnapshot(state)],
        historyFuture: [],
        canUndo: true,
        canRedo: false,
        ...nextState,
        hasUnsavedChanges: true
      }
    })
  },

  setMultiSelectMode: (enabled) => {
    set({ multiSelectMode: enabled })
  },

  setHighlight: (nodeIds) => {
    set({ highlightedNodeIds: nodeIds })
  },

  clearHighlight: () => {
    set({ highlightedNodeIds: [] })
  },

  enterMatchingPickMode: (sourceNodeId) => {
    set({
      matchingPickMode: true,
      matchingPickSourceNodeId: sourceNodeId,
      matchingPickStagedIds: [],
      puzzleBodyOpen: false,
      contextPanelOpen: false,
      activeEditorField: null,
    })
  },

  confirmMatchingPick: (pickedNodeId) => {
    const state = get()
    if (!state.matchingPickSourceNodeId) return
    if (pickedNodeId === state.matchingPickSourceNodeId) return
    // Toggle in/out of staged set
    const staged = state.matchingPickStagedIds
    const next = staged.includes(pickedNodeId)
      ? staged.filter((id) => id !== pickedNodeId)
      : [...staged, pickedNodeId]
    set({ matchingPickStagedIds: next })
  },

  cancelMatchingPickMode: () => {
    const sourceNodeId = get().matchingPickSourceNodeId
    set({
      matchingPickMode: false,
      matchingPickSourceNodeId: null,
      matchingPickStagedIds: [],
      puzzleBodyOpen: true,
      ...(sourceNodeId ? { selectedNodeId: sourceNodeId, selectedNodeIds: [sourceNodeId] } : {}),
    })
  },

  commitMatchingPickMode: () => {
    const state = get()
    const sourceNodeId = state.matchingPickSourceNodeId
    if (!sourceNodeId) return

    const sourceNode = state.nodes.find((n) => n.id === sourceNodeId)
    if (!sourceNode) return

    const existing = sourceNode.data.puzzleMatchingContent ?? { questionHtml: '', cards: [] }
    const alreadyIds = new Set(existing.cards.map((c) => c.nodeId))
    const newCards: MatchingCard[] = state.matchingPickStagedIds
      .filter((id) => !alreadyIds.has(id))
      .map((id) => ({ nodeId: id, isSolution: false, representativeLine: '' }))

    const updatedNodes = state.nodes.map((n) => {
      if (n.id !== sourceNodeId) return n
      return { ...n, data: { ...n.data, puzzleMatchingContent: { ...existing, cards: [...existing.cards, ...newCards] } } }
    })

    set({
      historyPast: [...state.historyPast, createSnapshot(state)],
      historyFuture: [],
      canUndo: true,
      canRedo: false,
      nodes: updatedNodes,
      edges: buildEdges(updatedNodes, state.edgeShapes),
      groups: normalizeGroups(state.groups, updatedNodes),
      hasUnsavedChanges: true,
      matchingPickMode: false,
      matchingPickSourceNodeId: null,
      matchingPickStagedIds: [],
      puzzleBodyOpen: true,
      selectedNodeId: sourceNodeId,
      selectedNodeIds: [sourceNodeId],
    })
  },

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
        multiSelectMode: false,
        connectionSourceNodeId: null,
        contextPanelOpen: false,
        narrativeBodyOpen: false,
        puzzleBodyOpen: false,
        activeEditorField: null
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
        multiSelectMode: false,
        connectionSourceNodeId: null,
        contextPanelOpen: false,
        narrativeBodyOpen: false,
        puzzleBodyOpen: false,
        activeEditorField: null
      }
    })
  }
}))
