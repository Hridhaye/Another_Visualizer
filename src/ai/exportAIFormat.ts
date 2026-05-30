import type { NarrativeNode, SlipType, Tag } from '../types/narrative'
import {
  DSL_ELEMENTS,
  DSL_PRESETS,
  getDSLElement,
  type DSLElementKey,
  type DSLRenderContext,
} from './dslElements'

/** Legacy export "modes" are now presets; kept as a type for existing callers. */
export type ExportMode = 'standard' | 'narrative'

function presetElements(mode: ExportMode): DSLElementKey[] {
  return DSL_PRESETS.find((preset) => preset.key === mode)?.elements ?? []
}

/**
 * Builds the helper-line header from ONLY the selected elements, followed by a
 * worked example card assembled from the same elements' example fragments.
 * This keeps the documentation in lockstep with what is actually exported.
 */
function buildHeader(selected: DSLElementKey[]): string {
  const selectedSet = new Set(selected)
  const ordered = DSL_ELEMENTS.filter((el) => selectedSet.has(el.key))

  const lines: string[] = [
    '# NARRATIVE BOARD DSL',
    '# Each card block starts with @CARD <CODE> — a unique alphanumeric id (letters, digits, _ or -).',
    '# @CARD is required; every field below is optional. Include only what you know; leave the rest out.',
    '# This export includes the following fields:',
  ]

  for (const element of ordered) {
    for (const helperLine of element.helper) {
      lines.push(`#   ${helperLine}`)
    }
  }

  lines.push('#')
  lines.push('# EXAMPLE:')
  const exampleBody: string[] = ['@CARD AA01']
  for (const element of ordered) {
    exampleBody.push(...element.example)
  }
  for (const exampleLine of exampleBody) {
    lines.push(exampleLine ? `#   ${exampleLine}` : '#')
  }

  lines.push('#')
  lines.push('# Import rules: existing codes are updated in-place; unknown codes create new cards.')
  lines.push('# Import is lenient — unrecognized or missing fields are skipped, never an error.')

  return lines.join('\n')
}

export type ExportOptions = {
  /** When true, emit only the helper lines + example, with no card blocks. */
  helperOnly?: boolean
}

/**
 * @param selectedElements explicit element selection. When omitted, falls back
 * to the preset implied by `mode` (backwards compatible with old callers).
 * @param options extra export switches (e.g. `helperOnly`).
 */
export function exportAIFormat(
  nodes: NarrativeNode[],
  slipTypes: SlipType[] = [],
  tags: Tag[] = [],
  mode: ExportMode = 'standard',
  selectedElements?: DSLElementKey[],
  options: ExportOptions = {},
): string {
  const selected = selectedElements ?? presetElements(mode)
  const orderedKeys = DSL_ELEMENTS.map((el) => el.key).filter((key) => selected.includes(key))

  const header = buildHeader(orderedKeys)
  if (options.helperOnly) return header

  const ctx: DSLRenderContext = { nodes, slipTypes, tags }

  const sorted = [...nodes].sort((left, right) => left.data.code.localeCompare(right.data.code))

  const cardBlocks = sorted
    .map((node) => {
      const lines = [`@CARD ${node.data.code.toUpperCase()}`]
      for (const key of orderedKeys) {
        lines.push(...getDSLElement(key).render(node, ctx))
      }
      return lines.join('\n').trimEnd()
    })
    .filter(Boolean)
    .join('\n\n')

  return cardBlocks.length > 0 ? `${header}\n\n${cardBlocks}` : header
}
