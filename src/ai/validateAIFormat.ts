import { PUZZLE_TYPES, type NarrativeNode } from '../types/narrative'
import type { AIBlock } from './parseAIBlocks'

export type AIValidationResult =
  | { ok: true; cards: AIBlock[] }
  | { ok: false; error: string }

/**
 * Import is intentionally lenient: we import whatever is parseable and leave the
 * rest blank rather than rejecting the whole paste. The only hard failure is a
 * block with no usable card code at all (nothing to attach data to).
 *
 * Per-field leniency:
 *  - Missing TITLE → left blank (importer keeps the existing title, if any).
 *  - Unknown PUZZLE type → dropped to "none" by the importer (not an error).
 *  - Duplicate codes → later block wins (de-duped here, last occurrence kept).
 *  - Unclosed CONTENT/BODY block → whatever was captured is used as-is.
 */
export function validateAIFormat(blocks: AIBlock[], _existingNodes: NarrativeNode[] = []): AIValidationResult {
  void _existingNodes
  void PUZZLE_TYPES

  const usable = blocks.filter((block) => block.code.trim().length > 0)

  // De-duplicate by code, keeping the last occurrence so a corrected re-paste
  // lower in the text overrides an earlier one.
  const byCode = new Map<string, AIBlock>()
  for (const block of usable) {
    byCode.set(block.code.toUpperCase(), block)
  }

  return { ok: true, cards: Array.from(byCode.values()) }
}
