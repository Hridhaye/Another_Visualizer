import type { NarrativeNode, SlipType } from '../types/narrative'

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
        lines.push(`SLIP: ${slipName}`)
      }

      if (node.data.puzzleType) {
        lines.push(`PUZZLE: ${node.data.puzzleType}`)
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
