import {
  getPuzzleDisplayText,
  type NarrativeNode,
  type SlipType,
  type Tag,
} from '../types/narrative'

/**
 * Single source of truth for the board-level DSL.
 *
 * Every exportable element is described once here: its label, which presets
 * include it, the helper-line documentation the AI reads, a fragment for the
 * worked example, and the renderer that turns a card into DSL lines.
 *
 * Both the helper-line header AND the exported card bodies are built by
 * iterating over the *selected* elements, so the two can never drift apart —
 * "included elements get included in the helper lines too."
 */

export type DSLElementKey =
  | 'title'
  | 'cardSlip'
  | 'slipGiven'
  | 'tags'
  | 'puzzle'
  | 'summary'
  | 'references'
  | 'body'

export type DSLRenderContext = {
  nodes: NarrativeNode[]
  slipTypes: SlipType[]
  tags: Tag[]
}

export type DSLElement = {
  key: DSLElementKey
  /** Short human label shown in the export checklist. */
  label: string
  /**
   * Helper-line documentation: each string becomes a `# ...` comment line in
   * the export header. Keep inputs that only accept specific values explicit
   * and unambiguous so the AI never has to guess.
   */
  helper: string[]
  /**
   * Example fragment (already without the `# ` prefix) inserted into the
   * worked EXAMPLE card. Only included when the element is selected.
   */
  example: string[]
  /** Renders the element's lines for one card, or [] to omit it. */
  render: (node: NarrativeNode, ctx: DSLRenderContext) => string[]
}

/* ── shared formatting helpers ─────────────────────────────────────────── */

function findSlipName(slipTypes: SlipType[], slipTypeId: string): string {
  const match = slipTypes.find((entry) => entry.id === slipTypeId)
  return match?.name ?? slipTypeId
}

function formatTags(tags: Tag[], tagIds: string[]): string | null {
  if (tagIds.length === 0) return null
  const names = tagIds
    .map((id) => tags.find((tag) => tag.id === id)?.name)
    .filter((name): name is string => Boolean(name))
  return names.length > 0 ? names.join(', ') : null
}

function formatReferences(value: string, nodes: NarrativeNode[]): string[] {
  const codeToTitle = new Map(nodes.map((n) => [n.data.code.toUpperCase(), n.data.title.trim()]))
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((code) => {
      const upper = code.toUpperCase()
      const title = codeToTitle.get(upper)
      return title ? `${upper} "${title}"` : upper
    })
}

function formatSlipGiven(slipTypes: SlipType[], slipGivenTypeIds: string[]): string | null {
  if (slipGivenTypeIds.length === 0) return null

  const countMap = new Map<string, number>()
  for (const id of slipGivenTypeIds) {
    countMap.set(id, (countMap.get(id) ?? 0) + 1)
  }

  const parts: string[] = []
  for (const [id, count] of countMap) {
    const name = findSlipName(slipTypes, id)
    parts.push(count > 1 ? `${name} ×${count}` : name)
  }
  return parts.join(', ')
}

/* ── the element registry ──────────────────────────────────────────────── */

export const DSL_ELEMENTS: DSLElement[] = [
  {
    key: 'title',
    label: 'Title',
    helper: ['TITLE: <text>                        — card title (free text, one line)'],
    example: ['TITLE: Forest Arrival'],
    render: (node) => (node.data.title.trim() ? [`TITLE: ${node.data.title.trim()}`] : []),
  },
  {
    key: 'cardSlip',
    label: 'Card Slip',
    helper: [
      'CARD_SLIP: <slip name>               — the slip type this card belongs to.',
      '                                       Must be one of the project\'s defined slip names (see EXAMPLE).',
    ],
    example: ['CARD_SLIP: Blue Slip'],
    render: (node, ctx) => {
      const slipName = findSlipName(ctx.slipTypes, node.data.slipTypeId)
      return slipName ? [`CARD_SLIP: ${slipName}`] : []
    },
  },
  {
    key: 'slipGiven',
    label: 'Slip Given',
    helper: [
      'SLIP_GIVEN: <slip> ×<n>, ...         — slips awarded when this card is played.',
      '                                       Comma-separated slip names; use "×<n>" for repeats, e.g. Red Slip ×2.',
    ],
    example: ['SLIP_GIVEN: Red Slip ×2, Green Slip'],
    render: (node, ctx) => {
      const slipGiven = formatSlipGiven(ctx.slipTypes, node.data.slipGivenTypeIds ?? [])
      return slipGiven ? [`SLIP_GIVEN: ${slipGiven}`] : []
    },
  },
  {
    key: 'tags',
    label: 'Tags',
    helper: ['TAGS: <tag>, ...                     — comma-separated tag names (created on import if new)'],
    example: ['TAGS: Location, Clue'],
    render: (node, ctx) => {
      const tagNames = formatTags(ctx.tags, node.data.tagIds ?? [])
      return tagNames ? [`TAGS: ${tagNames}`] : []
    },
  },
  {
    key: 'puzzle',
    label: 'Puzzle (type + summary)',
    helper: [
      'PUZZLE: <type>: <summary>            — puzzle type and a short one-line summary.',
      '                                       <type> MUST be exactly one of: fill | reorder | matching',
      '                                       (or omit the line entirely for no puzzle). Do not invent other types.',
      '                                         fill     → fill-in-the-blank within the body text',
      '                                         reorder  → put scrambled lines/boxes into the correct order',
      '                                         matching → pick which cards answer a question',
      '                                       Only the type and summary live here. Do NOT spell out blanks, box',
      '                                       order, or answers — leave any rough/undecided puzzle ideas as notes',
      '                                       at the bottom of BODY; the real puzzle is built later in the puzzle panel.',
    ],
    example: ['PUZZLE: fill: Name the object left at the scene'],
    render: (node) => {
      const puzzleText = getPuzzleDisplayText(node.data.puzzleType, node.data.puzzleSummary)
      return puzzleText ? [`PUZZLE: ${puzzleText}`] : []
    },
  },
  {
    key: 'summary',
    label: 'Summary',
    helper: [
      'SUMMARY:                             — short narrative summary block.',
      '                                       Free text on the following lines; ends at the next field or @CARD.',
    ],
    example: ['', 'SUMMARY:', 'The protagonist reaches the remote town as dusk falls.'],
    render: (node) =>
      node.data.summary.trim() ? ['', 'SUMMARY:', node.data.summary.trim()] : [],
  },
  {
    key: 'references',
    label: 'References',
    helper: [
      'REFERENCES:                          — outgoing connections to other cards.',
      '  - <CODE> "<title>", ...              One code per line (or comma-separated). The "<title>" is',
      '                                       informational only; import matches on CODE. Use codes that',
      '                                       exist (or are defined elsewhere in this same import).',
    ],
    example: ['', 'REFERENCES:', '- BB02 "Town Square"', '- CV14 "The Locked Door"'],
    render: (node, ctx) => {
      const references = formatReferences(node.data.referencesText, ctx.nodes)
      return references.length > 0 ? ['', 'REFERENCES:', ...references.map((ref) => `- ${ref}`)] : []
    },
  },
  {
    key: 'body',
    label: 'Narrative Body',
    helper: [
      'BODY:                                — full narrative body text.',
      'END_BODY                             — closes the BODY block (required when BODY is present).',
      '                                       ROUGH / UNFINISHED NOTES: put anything not yet decided or',
      '                                       implemented (draft puzzle ideas, open questions, "TODO"s) at the',
      '                                       BOTTOM of the body, clearly marked. The detailed puzzle build-out',
      '                                       happens later in the puzzle panel, not here.',
    ],
    example: [
      '',
      'BODY:',
      'Rain hammers the window as the detective opens the file.',
      '',
      '-- rough notes (not final) --',
      'Puzzle idea: fill-in-the-blank on the victim\'s last words. Decide exact blanks in the puzzle panel.',
      'END_BODY',
    ],
    render: (node) =>
      node.data.body.trim() ? ['', 'BODY:', node.data.body.trim(), 'END_BODY'] : [],
  },
]

export const DSL_ELEMENT_KEYS: DSLElementKey[] = DSL_ELEMENTS.map((el) => el.key)

const ELEMENT_BY_KEY = new Map(DSL_ELEMENTS.map((el) => [el.key, el]))

export function getDSLElement(key: DSLElementKey): DSLElement {
  const element = ELEMENT_BY_KEY.get(key)
  if (!element) throw new Error(`Unknown DSL element: ${key}`)
  return element
}

/* ── presets (the old export "modes") ──────────────────────────────────── */

export type DSLPresetKey = 'standard' | 'narrative' | 'full'

export type DSLPreset = {
  key: DSLPresetKey
  label: string
  elements: DSLElementKey[]
}

export const DSL_PRESETS: DSLPreset[] = [
  {
    key: 'standard',
    label: 'Standard',
    elements: ['title', 'cardSlip', 'slipGiven', 'tags', 'puzzle', 'summary', 'references'],
  },
  {
    key: 'narrative',
    label: 'Narrative',
    elements: ['title', 'puzzle', 'body'],
  },
  {
    key: 'full',
    label: 'Everything',
    elements: [...DSL_ELEMENT_KEYS],
  },
]

/** Returns the preset whose element set exactly matches the selection, if any. */
export function matchPreset(selected: Set<DSLElementKey>): DSLPresetKey | null {
  for (const preset of DSL_PRESETS) {
    if (preset.elements.length !== selected.size) continue
    if (preset.elements.every((key) => selected.has(key))) return preset.key
  }
  return null
}
