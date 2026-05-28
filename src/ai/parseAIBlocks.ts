import type { NarrativeNode } from '../types/narrative'

export type AIBlock = {
  code: string
  title: string
  slip: string
  puzzle: string
  summary: string
  references: string[]
  content: string
  rawLines: string[]
}

const SECTION_PREFIXES = ['TITLE:', 'SLIP:', 'PUZZLE:', 'SUMMARY:', 'REFERENCES:', 'CONTENT:']

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function trimBlockText(value: string): string {
  return value.replace(/\n{3,}/g, '\n\n').trim()
}

function collectSummary(lines: string[], startIndex: number): { text: string; nextIndex: number } {
  const collected: string[] = []
  let index = startIndex

  while (index < lines.length) {
    const raw = lines[index]
    const trimmed = raw.trim()

    if (/^@CARD\b/i.test(trimmed) || /^(TITLE|SLIP|PUZZLE|SUMMARY|REFERENCES|CONTENT)\s*:/i.test(trimmed)) {
      break
    }

    collected.push(raw)
    index += 1
  }

  return { text: trimBlockText(collected.join('\n')), nextIndex: index }
}

function collectReferences(lines: string[], startIndex: number): { references: string[]; nextIndex: number } {
  const references: string[] = []
  let index = startIndex

  while (index < lines.length) {
    const raw = lines[index]
    const trimmed = raw.trim()

    if (/^@CARD\b/i.test(trimmed) || /^(TITLE|SLIP|PUZZLE|SUMMARY|REFERENCES|CONTENT)\s*:/i.test(trimmed)) {
      break
    }

    if (/^[-*]\s*/.test(trimmed)) {
      references.push(trimmed.replace(/^[-*]\s*/, '').trim())
    } else if (trimmed) {
      references.push(...trimmed.split(',').map((part) => part.trim()).filter(Boolean))
    }

    index += 1
  }

  return { references: Array.from(new Set(references)), nextIndex: index }
}

export function parseAIBlocks(rawText: string): AIBlock[] {
  const lines = normalizeLineEndings(rawText).split('\n')
  const blocks: AIBlock[] = []

  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    const cardMatch = trimmed.match(/^@CARD\s+([A-Za-z0-9_-]+)\s*$/i)
    if (!cardMatch) {
      index += 1
      continue
    }

    const blockLines = [line]
    index += 1

    let title = ''
    let slip = ''
    let puzzle = ''
    let summary = ''
    const references: string[] = []
    let content = ''

    while (index < lines.length) {
      const current = lines[index]
      const currentTrimmed = current.trim()

      if (/^@CARD\b/i.test(currentTrimmed)) {
        break
      }

      blockLines.push(current)

      if (/^TITLE\s*:/i.test(currentTrimmed)) {
        title = currentTrimmed.replace(/^TITLE\s*:\s*/i, '').trim()
      } else if (/^SLIP\s*:/i.test(currentTrimmed)) {
        slip = currentTrimmed.replace(/^SLIP\s*:\s*/i, '').trim()
      } else if (/^PUZZLE\s*:/i.test(currentTrimmed)) {
        puzzle = currentTrimmed.replace(/^PUZZLE\s*:\s*/i, '').trim()
      } else if (/^SUMMARY\s*:/i.test(currentTrimmed)) {
        const summaryResult = collectSummary(lines, index + 1)
        summary = summaryResult.text
        for (let cursor = index + 1; cursor < summaryResult.nextIndex; cursor += 1) {
          blockLines.push(lines[cursor])
        }
        index = summaryResult.nextIndex
        continue
      } else if (/^REFERENCES\s*:/i.test(currentTrimmed)) {
        const referencesResult = collectReferences(lines, index + 1)
        references.push(...referencesResult.references)
        for (let cursor = index + 1; cursor < referencesResult.nextIndex; cursor += 1) {
          blockLines.push(lines[cursor])
        }
        index = referencesResult.nextIndex
        continue
      } else if (/^CONTENT\s*:/i.test(currentTrimmed)) {
        const contentLines: string[] = []
        let contentIndex = index + 1

        while (contentIndex < lines.length) {
          const candidate = lines[contentIndex]
          if (/^END_CONTENT\s*$/i.test(candidate.trim())) {
            blockLines.push(candidate)
            contentIndex += 1
            break
          }
          blockLines.push(candidate)
          contentLines.push(candidate)
          contentIndex += 1
        }

        content = trimBlockText(contentLines.join('\n'))
        index = contentIndex
        continue
      }

      index += 1
    }

    blocks.push({
      code: cardMatch[1].trim(),
      title,
      slip,
      puzzle,
      summary,
      references,
      content,
      rawLines: blockLines
    })
  }

  return blocks
}

export function getAIBlockCode(node: NarrativeNode): string {
  return node.data.code.trim().toUpperCase()
}

export function isKnownSection(line: string): boolean {
  return SECTION_PREFIXES.some((prefix) => line.trim().toUpperCase().startsWith(prefix))
}
