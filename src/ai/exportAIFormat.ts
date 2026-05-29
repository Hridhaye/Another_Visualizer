import { getPuzzleDisplayText, type FillPuzzleContent, type MatchingPuzzleContent, type NarrativeNode, type ReorderPuzzleContent, type SlipType, type Tag } from '../types/narrative'

export type ExportMode = 'standard' | 'narrative' | 'narrative-puzzle'

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

// Replaces blank placeholders with [word] or [___], preserving their position in the text
function formatFillPuzzle(fill: FillPuzzleContent): string[] {
  const blankMap = new Map(fill.blanks.map((b) => [b.id, b.assignedWord]))
  const resolved = fill.bodyHtml.replace(
    /<span[^>]*data-blank-id="([^"]+)"[^>]*>.*?<\/span>/g,
    (_, id) => {
      const word = blankMap.get(id)
      return word ? `[${word}]` : '[___]'
    }
  )
  const text = resolved.replace(/<[^>]+>/g, '').trim()
  return text ? ['PUZZLE_CONTENT:', text, 'END_PUZZLE_CONTENT'] : []
}

function formatReorderPuzzle(reorder: ReorderPuzzleContent): string[] {
  const boxMap = new Map(reorder.boxes.map((b) => [b.id, b.text]))
  const ordered = reorder.solutionOrder
    .map((id, i) => `  ${i + 1}. ${boxMap.get(id) ?? ''}`)
    .filter(Boolean)
  return ordered.length > 0
    ? ['PUZZLE_CONTENT:', ...ordered, 'END_PUZZLE_CONTENT']
    : []
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim()
}

function formatMatchingPuzzle(matching: MatchingPuzzleContent, nodes: NarrativeNode[]): string[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n.data]))
  const lines: string[] = ['PUZZLE_CONTENT:']

  const question = stripHtml(matching.questionHtml)
  if (question) lines.push(question)

  for (const card of matching.cards) {
    const data = nodeMap.get(card.nodeId)
    const label = data ? `${data.code.toUpperCase()} "${data.title.trim()}"` : card.nodeId
    if (card.isSolution) {
      lines.push(`  [solution card] ${label}${card.representativeLine.trim() ? ` — ${card.representativeLine.trim()}` : ''}`)
    } else {
      lines.push(`  [card] ${label}`)
    }
  }

  lines.push('END_PUZZLE_CONTENT')
  return lines.length > 2 ? lines : []
}

const SCHEMA_HEADERS: Record<ExportMode, string> = {
  standard: `\
# NARRATIVE BOARD DSL — Standard
# Each card block starts with @CARD <CODE> (unique alphanumeric id).
# Fields (all optional except @CARD):
#   TITLE: <text>                        — card title
#   CARD_SLIP: <slip name>               — slip type this card belongs to
#   SLIP_GIVEN: <slip> ×<n>, ...         — slips awarded when this card is played
#   TAGS: <tag>, ...                     — comma-separated tag names
#   PUZZLE: <type>: <description>        — puzzle type and short description
#   SUMMARY:                             — multi-line narrative summary (ends at next field or @CARD)
#   REFERENCES: - <CODE> "<title>", ...  — outgoing connections; title is informational, import uses code only
# Import rules: existing codes are updated in-place; unknown codes create new cards.`,

  narrative: `\
# NARRATIVE BOARD DSL — Narrative
# Each card block starts with @CARD <CODE> (unique alphanumeric id).
# Fields (all optional except @CARD):
#   TITLE: <text>                  — card title
#   PUZZLE: <type>: <description>  — puzzle type and short description
#   BODY:                          — full narrative body text
#   END_BODY                       — closes the BODY block
# Import rules: existing codes are updated in-place; unknown codes create new cards.`,

  'narrative-puzzle': `\
# NARRATIVE BOARD DSL — Narrative + Puzzle
# Each card block starts with @CARD <CODE> (unique alphanumeric id).
# Fields (all optional except @CARD):
#   TITLE: <text>                  — card title
#   PUZZLE: <type>: <description>  — puzzle type and short description
#   BODY:                          — full narrative body text
#   END_BODY                       — closes the BODY block
#   PUZZLE_CONTENT:                — resolved puzzle content (read-only; not imported)
#     fill    → body text with blanks shown as [word] or [___] if unassigned
#     reorder → boxes in correct solution order
#     matching → question text, then cards under consideration marking solution cards and their representative line
#   END_PUZZLE_CONTENT
# Import rules: existing codes are updated in-place; unknown codes create new cards.`,
}

export function exportAIFormat(nodes: NarrativeNode[], slipTypes: SlipType[] = [], tags: Tag[] = [], mode: ExportMode = 'standard'): string {
  const sorted = [...nodes].sort((left, right) => left.data.code.localeCompare(right.data.code))

  const cardBlocks = sorted
    .map((node) => {
      const lines = [`@CARD ${node.data.code.toUpperCase()}`]

      if (node.data.title.trim()) {
        lines.push(`TITLE: ${node.data.title.trim()}`)
      }

      if (mode === 'standard') {
        const slipName = findSlipName(slipTypes, node.data.slipTypeId)
        if (slipName) lines.push(`CARD_SLIP: ${slipName}`)

        const slipGiven = formatSlipGiven(slipTypes, node.data.slipGivenTypeIds ?? [])
        if (slipGiven) lines.push(`SLIP_GIVEN: ${slipGiven}`)

        const tagNames = formatTags(tags, node.data.tagIds ?? [])
        if (tagNames) lines.push(`TAGS: ${tagNames}`)
      }

      const puzzleText = getPuzzleDisplayText(node.data.puzzleType, node.data.puzzleSummary)
      if (puzzleText) lines.push(`PUZZLE: ${puzzleText}`)

      if (mode === 'standard') {
        if (node.data.summary.trim()) {
          lines.push('')
          lines.push('SUMMARY:')
          lines.push(node.data.summary.trim())
        }

        const references = formatReferences(node.data.referencesText, nodes)
        if (references.length > 0) {
          lines.push('')
          lines.push('REFERENCES:')
          references.forEach((ref) => lines.push(`- ${ref}`))
        }
      }

      if (mode === 'narrative' || mode === 'narrative-puzzle') {
        if (node.data.body.trim()) {
          lines.push('')
          lines.push('BODY:')
          lines.push(node.data.body.trim())
          lines.push('END_BODY')
        }
      }

      if (mode === 'narrative-puzzle') {
        let puzzleLines: string[] = []
        if (node.data.puzzleType === 'fill' && node.data.puzzleFillContent) {
          puzzleLines = formatFillPuzzle(node.data.puzzleFillContent)
        } else if (node.data.puzzleType === 'reorder' && node.data.puzzleReorderContent) {
          puzzleLines = formatReorderPuzzle(node.data.puzzleReorderContent)
        } else if (node.data.puzzleType === 'matching' && node.data.puzzleMatchingContent) {
          puzzleLines = formatMatchingPuzzle(node.data.puzzleMatchingContent, nodes)
        }
        if (puzzleLines.length > 0) {
          lines.push('')
          lines.push(...puzzleLines)
        }
      }

      return lines.join('\n').trimEnd()
    })
    .filter(Boolean)
    .join('\n\n')

  const header = SCHEMA_HEADERS[mode]
  return cardBlocks.length > 0
    ? `${header}\n\n${cardBlocks}`
    : header
}
