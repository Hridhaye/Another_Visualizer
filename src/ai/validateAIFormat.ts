import { PUZZLE_TYPES, type NarrativeNode } from '../types/narrative'
import type { AIBlock } from './parseAIBlocks'

export type AIValidationResult =
  | { ok: true; cards: AIBlock[] }
  | { ok: false; error: string }

export function validateAIFormat(blocks: AIBlock[], existingNodes: NarrativeNode[] = []): AIValidationResult {
  const seen = new Set<string>()
  const duplicates: string[] = []

  for (const block of blocks) {
    const hasContentDirective = block.rawLines.some((line) => /^CONTENT\s*:/i.test(line.trim()))
    const hasEndContent = block.rawLines.some((line) => /^END_CONTENT\s*$/i.test(line.trim()))

    if (hasContentDirective && !hasEndContent) {
      return { ok: false, error: `Card ${block.code} is missing END_CONTENT.` }
    }
  }

  for (const block of blocks) {
    if (!block.code.trim()) {
      return { ok: false, error: 'Each @CARD block must include a card code.' }
    }

    if (seen.has(block.code.toUpperCase())) {
      duplicates.push(block.code.toUpperCase())
    }
    seen.add(block.code.toUpperCase())

    if (!block.title.trim()) {
      return { ok: false, error: `Card ${block.code} is missing a TITLE value.` }
    }

    if (block.puzzle && !PUZZLE_TYPES.includes(block.puzzle.toLowerCase() as (typeof PUZZLE_TYPES)[number])) {
      return { ok: false, error: `Card ${block.code} has an invalid PUZZLE type.` }
    }
  }

  if (duplicates.length > 0) {
    return { ok: false, error: `Duplicate card codes found: ${duplicates.join(', ')}.` }
  }

  const knownCodes = new Set(existingNodes.map((node) => node.data.code.toUpperCase()))
  for (const block of blocks) {
    if (!knownCodes.has(block.code.toUpperCase()) && block.title.trim() === '') {
      return { ok: false, error: `Card ${block.code} is missing a TITLE value.` }
    }
  }

  return { ok: true, cards: blocks }
}
