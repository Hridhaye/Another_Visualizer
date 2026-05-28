import type { Edge, Node } from 'reactflow'

export const PUZZLE_TYPES = [
  'none',
  'fill',
  'reorder',
  'matching'
] as const

export type PuzzleType = (typeof PUZZLE_TYPES)[number]

export type SlipType = {
  id: string
  name: string
  color: string
}

export type CardGroup = {
  id: string
  name: string
  nodeIds: string[]
}

export type CardData = {
  code: string
  title: string
  summary: string
  body: string
  slipTypeId: string
  referencesText: string
  puzzleType: PuzzleType
}

export type NarrativeNode = Node<CardData>
export type NarrativeEdge = Edge

export type SerializedMetadata = {
  projectName: string
  createdAt: string
  updatedAt: string
}

export type SerializedViewport = {
  x: number
  y: number
  zoom: number
}

export type SerializedProject = {
  version: 1
  metadata: SerializedMetadata
  viewport: SerializedViewport
  slipTypes: SlipType[]
  groups: CardGroup[]
  nodes: NarrativeNode[]
  [key: string]: unknown
}

export type SerializedProjectData = {
  version: 1
  metadata: SerializedMetadata
  viewport: SerializedViewport
  nodes: NarrativeNode[]
  slipTypes: SlipType[]
  groups: CardGroup[]
}

export type SectionKey =
  | 'boardControls'
  | 'slipManager'
  | 'cardEditor'

export type SectionOpenState = Record<SectionKey, boolean>
