import { getPuzzleDisplayText, type NarrativeNode, type SlipType } from '../types/narrative'
import { effectiveGivenSlipIds } from '../graph/buildEdgesFromReferences'

function findSlipName(slipTypes: SlipType[], slipTypeId: string): string {
  const match = slipTypes.find((entry) => entry.id === slipTypeId)
  return match?.name ?? slipTypeId
}

function formatReferences(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
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

export function exportAIFormat(nodes: NarrativeNode[], slipTypes: SlipType[] = []): string {
  const sorted = [...nodes].sort((left, right) => left.data.code.localeCompare(right.data.code))

  return sorted
    .map((node) => {
      const lines = [`@CARD ${node.data.code.toUpperCase()}`]

      if (node.data.title.trim()) {
        lines.push(`TITLE: ${node.data.title.trim()}`)
      }

      const slipName = findSlipName(slipTypes, node.data.slipTypeId)
      if (slipName) {
        lines.push(`CARD_SLIP: ${slipName}`)
      }

      const slipGiven = formatSlipGiven(slipTypes, effectiveGivenSlipIds(node, sorted))
      if (slipGiven) {
        lines.push(`SLIP_GIVEN: ${slipGiven}`)
      }

      const puzzleText = getPuzzleDisplayText(node.data.puzzleType, node.data.puzzleSummary)
      if (puzzleText) {
        lines.push(`PUZZLE: ${puzzleText}`)
      }

      if (node.data.summary.trim()) {
        lines.push('')
        lines.push('SUMMARY:')
        lines.push(node.data.summary.trim())
      }

      const references = formatReferences(node.data.referencesText)
      if (references.length > 0) {
        lines.push('')
        lines.push('REFERENCES:')
        references.forEach((reference) => lines.push(`- ${reference}`))
      }

      return lines.join('\n').trimEnd()
    })
    .filter(Boolean)
    .join('\n\n')
}
