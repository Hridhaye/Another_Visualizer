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

export type SerializedProjectData = {
  nodes: NarrativeNode[]
  edges: NarrativeEdge[]
  slipTypes: SlipType[]
}

export type SectionKey =
  | 'boardControls'
  | 'slipManager'
  | 'cardEditor'

export type SectionOpenState = Record<SectionKey, boolean>

export type ContextPanelPosition = {
  x: number
  y: number
}
