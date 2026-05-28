import type { Edge, Node } from 'reactflow'

export const PUZZLE_TYPES = [
  'none',
  'fill',
  'reorder',
  'matching'
] as const

export type PuzzleType = (typeof PUZZLE_TYPES)[number]

export function getPuzzleLabel(puzzleType: PuzzleType): string {
  switch (puzzleType) {
    case 'fill':
      return 'Fill'
    case 'reorder':
      return 'Reorder'
    case 'matching':
      return 'Matching'
    case 'none':
    default:
      return 'No puzzle'
  }
}

export function getPuzzleDisplayText(puzzleType: PuzzleType, puzzleSummary = ''): string {
  if (puzzleType === 'none') {
    return ''
  }

  const summary = puzzleSummary.trim()
  return summary ? `${getPuzzleLabel(puzzleType)}: ${summary}` : getPuzzleLabel(puzzleType)
}

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

export type FillBlank = {
  id: string
  assignedWord: string | null
}

export type FillWordBankEntry = {
  id: string
  word: string
}

export type FillPuzzleContent = {
  /** HTML string of the text body, with blank placeholders rendered as <span data-blank-id="..."></span> */
  bodyHtml: string
  blanks: FillBlank[]
  wordBank: FillWordBankEntry[]
  showAnswers: boolean
}

export type ReorderBox = {
  id: string
  text: string
}

export type ReorderPuzzleContent = {
  /** Box pool — all boxes, identified by id */
  boxes: ReorderBox[]
  /** ids in the scrambled order the player first sees */
  scrambledOrder: string[]
  /** ids in the correct solution order */
  solutionOrder: string[]
}

export type MatchingCard = {
  /** node id of the referenced card */
  nodeId: string
  /** whether this card is a solution card */
  isSolution: boolean
  /** representative line the author writes for solution cards; may be empty */
  representativeLine: string
}

export type MatchingPuzzleContent = {
  questionHtml: string
  cards: MatchingCard[]
}

export type CardData = {
  code: string
  title: string
  summary: string
  body: string
  slipTypeId: string
  slipGivenTypeIds: string[]
  referencesText: string
  /** Reference codes whose "slip form" is toggled on: the referenced card's slip type is auto-added to this card's given slips. */
  referenceSlipForms?: string[]
  puzzleType: PuzzleType
  puzzleSummary?: string
  puzzleFillContent?: FillPuzzleContent
  puzzleReorderContent?: ReorderPuzzleContent
  puzzleMatchingContent?: MatchingPuzzleContent
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
