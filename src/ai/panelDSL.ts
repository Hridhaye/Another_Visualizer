import type {
  FillBlank,
  FillPuzzleContent,
  FillWordBankEntry,
  MatchingCard,
  MatchingPuzzleContent,
  NarrativeNode,
  ReorderBox,
  ReorderPuzzleContent,
} from '../types/narrative'

/**
 * Per-panel DSL: plain-text serializers for the narrative body and the three
 * puzzle panels. Designed so an AI model can both read existing content and
 * generate replacement content that pastes straight back in.
 *
 * Rich text uses markdown-style markers: **bold**, *italic*, __underline__.
 */

// ── Rich-text <-> markdown ─────────────────────────────────────────────────

const uid = () => crypto.randomUUID()

/** Convert the panel's stored HTML into markdown-marked plain text. */
export function htmlToMarkdown(html: string): string {
  if (!html) return ''
  const container = document.createElement('div')
  container.innerHTML = html

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
    if (node.nodeType !== Node.ELEMENT_NODE) return ''

    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()
    const inner = Array.from(el.childNodes).map(walk).join('')

    switch (tag) {
      case 'b':
      case 'strong':
        return `**${inner}**`
      case 'i':
      case 'em':
        return `*${inner}*`
      case 'u':
        return `__${inner}__`
      case 'br':
        return '\n'
      case 'div':
      case 'p':
        return `${inner}\n`
      default:
        return inner
    }
  }

  return Array.from(container.childNodes).map(walk).join('').replace(/\n+$/g, '').trim()
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Convert markdown-marked plain text back into the panel's HTML form. */
export function markdownToHtml(text: string): string {
  if (!text) return ''
  // Escape first so author text can't inject markup; markers are added after.
  const lines = text.split('\n').map((line) => {
    let out = escapeHtml(line)
    out = out.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    out = out.replace(/__([^_]+)__/g, '<u>$1</u>')
    out = out.replace(/\*([^*]+)\*/g, '<i>$1</i>')
    return out
  })
  return lines.join('<br>')
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Pulls the body of a SECTION:\n...\nEND_SECTION block (case-insensitive). */
function readBlock(text: string, name: string): string | null {
  const re = new RegExp(`^${name}\\s*:?\\s*$([\\s\\S]*?)^END_${name}\\s*$`, 'im')
  const match = text.match(re)
  return match ? match[1].replace(/^\n/, '').replace(/\n$/, '') : null
}

/** Pulls a single-line `KEY: value` field (case-insensitive). */
function readField(text: string, name: string): string | null {
  const re = new RegExp(`^${name}\\s*:\\s*(.*)$`, 'im')
  const match = text.match(re)
  return match ? match[1].trim() : null
}

// ── Narrative body ───────────────────────────────────────────────────────

export const BODY_HEADER = `\
# NARRATIVE BODY
# Plain text below. Formatting markers: **bold**, *italic*, __underline__.
# Everything after this comment block becomes the card body.`

export function exportBodyDSL(bodyHtml: string): string {
  return `${BODY_HEADER}\n\n${htmlToMarkdown(bodyHtml)}`
}

export function importBodyDSL(raw: string): string {
  // Strip comment lines, then convert the remaining markdown to HTML.
  const text = raw
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n')
    .trim()
  return markdownToHtml(text)
}

// ── Rough notes ────────────────────────────────────────────────────────────

export const NOTES_HEADER = `\
# ROUGH NOTES
# Plain text below — a scratch pad for unfinished or undecided ideas
# (draft puzzle content, open questions, TODOs). No formatting markers.
# Everything after this comment block becomes the card's rough notes.`

export function exportNotesDSL(notes: string): string {
  return `${NOTES_HEADER}\n\n${notes ?? ''}`.trimEnd()
}

export function importNotesDSL(raw: string): string {
  // Strip leading comment lines; keep the remaining text verbatim.
  const lines = raw.split('\n')
  let start = 0
  while (start < lines.length && (/^\s*#/.test(lines[start]) || lines[start].trim() === '')) {
    start += 1
  }
  return lines.slice(start).join('\n').replace(/\s+$/, '')
}

// ── Fill puzzle ──────────────────────────────────────────────────────────

export const FILL_HEADER = `\
# FILL PUZZLE
# TEXT: body sentence; mark each blank with [[n]] (n = blank number, in order).
# WORD_BANK: comma-separated words shown to the player (distractors allowed).
# ANSWERS: one "n = word" line per blank giving the correct word.
# Formatting markers in TEXT: **bold**, *italic*, __underline__.`

export function exportFillDSL(fill: FillPuzzleContent): string {
  // Number blanks in document order by walking the bodyHtml.
  const blankOrder: string[] = []
  fill.bodyHtml.replace(/data-blank-id="([^"]+)"/g, (_, id) => {
    blankOrder.push(id)
    return ''
  })
  const blankIndex = new Map(blankOrder.map((id, i) => [id, i + 1]))

  // Build TEXT: replace blank spans with [[n]], convert rest to markdown.
  const withMarkers = fill.bodyHtml.replace(
    /<span[^>]*data-blank-id="([^"]+)"[^>]*>.*?<\/span>/g,
    (_, id) => `[[${blankIndex.get(id) ?? '?'}]]`
  )
  const textLine = htmlToMarkdown(withMarkers)

  const wordBank = fill.wordBank.map((w) => w.word).join(', ')

  const answerLines = fill.blanks
    .map((b) => ({ n: blankIndex.get(b.id), word: b.assignedWord }))
    .filter((a): a is { n: number; word: string } => Boolean(a.n) && Boolean(a.word))
    .sort((a, b) => a.n - b.n)
    .map((a) => `${a.n} = ${a.word}`)

  const lines = [FILL_HEADER, '']
  lines.push('TEXT:', textLine, 'END_TEXT', '')
  lines.push(`WORD_BANK: ${wordBank}`, '')
  lines.push('ANSWERS:', ...answerLines, 'END_ANSWERS')
  return lines.join('\n')
}

export function importFillDSL(raw: string): FillPuzzleContent {
  const text = readBlock(raw, 'TEXT') ?? ''
  const wordBankRaw = readField(raw, 'WORD_BANK') ?? ''
  const answersRaw = readBlock(raw, 'ANSWERS') ?? ''

  // Parse answers: "n = word"
  const answers = new Map<number, string>()
  for (const line of answersRaw.split('\n')) {
    const m = line.match(/^\s*(\d+)\s*=\s*(.+?)\s*$/)
    if (m) answers.set(parseInt(m[1], 10), m[2].trim())
  }

  // Build word bank entries.
  const wordBank: FillWordBankEntry[] = wordBankRaw
    .split(',')
    .map((w) => w.trim())
    .filter(Boolean)
    .map((word) => ({ id: uid(), word }))

  // Replace [[n]] markers with blank spans, tracking each blank's number.
  const blanks: FillBlank[] = []
  const html = markdownToHtml(text).replace(/\[\[(\d+)\]\]/g, (_, nStr) => {
    const n = parseInt(nStr, 10)
    const id = uid()
    blanks.push({ id, assignedWord: answers.get(n) ?? null })
    return `<span data-blank-id="${id}" class="puzzle-fill-blank" contenteditable="false"> </span>`
  })

  return { bodyHtml: html, blanks, wordBank, showAnswers: false }
}

// ── Reorder puzzle ─────────────────────────────────────────────────────────

export const REORDER_HEADER = `\
# REORDER PUZZLE
# SOLUTION: numbered list giving the boxes in their CORRECT order.
# SCRAMBLED: comma-separated solution-numbers giving the order the player
#   first sees (e.g. "3, 1, 2"). Omit to keep the solution order.`

export function exportReorderDSL(reorder: ReorderPuzzleContent): string {
  const boxMap = new Map(reorder.boxes.map((b) => [b.id, b.text]))
  // Solution position index per box id (1-based).
  const solPos = new Map(reorder.solutionOrder.map((id, i) => [id, i + 1]))

  const solutionLines = reorder.solutionOrder.map(
    (id, i) => `${i + 1}. ${boxMap.get(id) ?? ''}`
  )
  const scrambledNums = reorder.scrambledOrder
    .map((id) => solPos.get(id))
    .filter((n): n is number => Boolean(n))

  const lines = [REORDER_HEADER, '']
  lines.push('SOLUTION:', ...solutionLines, 'END_SOLUTION', '')
  lines.push(`SCRAMBLED: ${scrambledNums.join(', ')}`)
  return lines.join('\n')
}

export function importReorderDSL(raw: string): ReorderPuzzleContent {
  const solutionRaw = readBlock(raw, 'SOLUTION') ?? ''
  const scrambledRaw = readField(raw, 'SCRAMBLED') ?? ''

  // Each numbered line becomes a box, in solution order.
  const boxes: ReorderBox[] = []
  const solutionOrder: string[] = []
  for (const line of solutionRaw.split('\n')) {
    const m = line.match(/^\s*\d+[.)]\s*(.*)$/)
    if (!m) continue
    const id = uid()
    boxes.push({ id, text: m[1].trim() })
    solutionOrder.push(id)
  }

  // Scrambled order references solution positions (1-based).
  let scrambledOrder: string[]
  const scrambledNums = scrambledRaw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= solutionOrder.length)
  if (scrambledNums.length === solutionOrder.length) {
    scrambledOrder = scrambledNums.map((n) => solutionOrder[n - 1])
  } else {
    scrambledOrder = [...solutionOrder]
  }

  return { boxes, scrambledOrder, solutionOrder }
}

// ── Matching puzzle ──────────────────────────────────────────────────────

export const MATCHING_HEADER = `\
# MATCHING PUZZLE
# QUESTION: the prompt shown above the cards (formatting markers allowed).
# CARDS: one "- <CODE>" line per card under consideration. Append
#   [solution] to mark a solution card, optionally followed by "title" then
#   — representative line. Cards are matched to the board by CODE.`

export function exportMatchingDSL(
  matching: MatchingPuzzleContent,
  nodes: NarrativeNode[]
): string {
  const nodeMap = new Map(nodes.map((n) => [n.id, n.data]))

  const cardLines = matching.cards.map((card) => {
    const data = nodeMap.get(card.nodeId)
    const code = data ? data.code.toUpperCase() : card.nodeId
    if (!card.isSolution) return `- ${code}`
    const rep = card.representativeLine.trim()
    return `- ${code} [solution]${rep ? ` — ${rep}` : ''}`
  })

  const lines = [MATCHING_HEADER, '']
  lines.push('QUESTION:', htmlToMarkdown(matching.questionHtml), 'END_QUESTION', '')
  lines.push('CARDS:', ...cardLines, 'END_CARDS')
  return lines.join('\n')
}

/**
 * Imports a matching block. Resolves card CODEs against the board; codes that
 * don't match an existing card are dropped (matching cards must reference real
 * cards). Returns the new content plus any unresolved codes for feedback.
 */
export function importMatchingDSL(
  raw: string,
  nodes: NarrativeNode[]
): { content: MatchingPuzzleContent; unresolved: string[] } {
  const questionRaw = readBlock(raw, 'QUESTION') ?? ''
  const cardsRaw = readBlock(raw, 'CARDS') ?? ''

  const codeToId = new Map(nodes.map((n) => [n.data.code.trim().toUpperCase(), n.id]))

  const cards: MatchingCard[] = []
  const unresolved: string[] = []

  for (const line of cardsRaw.split('\n')) {
    const trimmed = line.replace(/^\s*[-*]\s*/, '').trim()
    if (!trimmed) continue

    const codeMatch = trimmed.match(/^([A-Za-z0-9_-]+)/)
    if (!codeMatch) continue
    const code = codeMatch[1].toUpperCase()
    const nodeId = codeToId.get(code)
    if (!nodeId) {
      unresolved.push(code)
      continue
    }

    const isSolution = /\[solution\]/i.test(trimmed)
    let representativeLine = ''
    if (isSolution) {
      // Take text after an em-dash or hyphen following [solution].
      const repMatch = trimmed.match(/\[solution\]\s*(?:—|-)\s*(.+)$/i)
      if (repMatch) representativeLine = repMatch[1].replace(/^"|"$/g, '').trim()
    }

    cards.push({ nodeId, isSolution, representativeLine })
  }

  return {
    content: { questionHtml: markdownToHtml(questionRaw), cards },
    unresolved,
  }
}
