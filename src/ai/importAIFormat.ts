import { buildEdgesFromReferences } from '../graph/buildEdgesFromReferences'
import type { NarrativeEdge, NarrativeNode, SlipType } from '../types/narrative'
import { PUZZLE_TYPES } from '../types/narrative'
import { parseAIBlocks } from './parseAIBlocks'
import { validateAIFormat } from './validateAIFormat'

export type AIImportResult = {
  updatedNodes: NarrativeNode[]
  updatedEdges: NarrativeEdge[]
  createdCount: number
  updatedCount: number
}

function resolveSlipTypeId(slipTypes: SlipType[], value: string): string {
  const candidate = slipTypes.find((entry) => entry.name.toLowerCase() === value.toLowerCase() || entry.id.toLowerCase() === value.toLowerCase())
  return candidate?.id ?? slipTypes[0]?.id ?? 'blue'
}

function resolveSlipGivenTypeIds(slipTypes: SlipType[], values: string[]): string[] {
  return values
    .map((value) => {
      const candidate = slipTypes.find((entry) => entry.name.toLowerCase() === value.toLowerCase() || entry.id.toLowerCase() === value.toLowerCase())
      return candidate?.id ?? null
    })
    .filter((id): id is string => id !== null)
}

function normalizePuzzleType(value: string): (typeof PUZZLE_TYPES)[number] {
  const normalized = value.trim().toLowerCase()
  return PUZZLE_TYPES.includes(normalized as (typeof PUZZLE_TYPES)[number])
    ? (normalized as (typeof PUZZLE_TYPES)[number])
    : 'none'
}

export function importAIFormat(rawText: string, existingNodes: NarrativeNode[], slipTypes: SlipType[]): AIImportResult {
  const blocks = parseAIBlocks(rawText)
  const validation = validateAIFormat(blocks, existingNodes)

  if (!validation.ok) {
    throw new Error(validation.error)
  }

  const existingByCode = new Map(existingNodes.map((node) => [node.data.code.toUpperCase(), node]))
  const updatedNodes = existingNodes.map((node) => ({ ...node }))
  let createdCount = 0
  let updatedCount = 0

  for (const block of validation.cards) {
    const existing = existingByCode.get(block.code.toUpperCase())

    if (existing) {
      const nextNode: NarrativeNode = {
        ...existing,
        data: {
          ...existing.data,
          code: block.code.toUpperCase(),
          title: block.title.trim() || existing.data.title,
          summary: block.summary.trim() || existing.data.summary,
          body: block.content.trim() || existing.data.body,
          slipTypeId: resolveSlipTypeId(slipTypes, block.slip || existing.data.slipTypeId),
          slipGivenTypeIds: block.slipGiven.length > 0
            ? resolveSlipGivenTypeIds(slipTypes, block.slipGiven)
            : (existing.data.slipGivenTypeIds ?? []),
          referencesText: block.references.join(', '),
          puzzleType: normalizePuzzleType(block.puzzle || existing.data.puzzleType)
        }
      }

      updatedNodes.splice(updatedNodes.findIndex((node) => node.id === existing.id), 1, nextNode)
      updatedCount += 1
      continue
    }

    const newNode: NarrativeNode = {
      id: crypto.randomUUID(),
      type: 'narrativeCard',
      position: {
        x: 120 + createdCount * 40,
        y: 120 + createdCount * 60
      },
      data: {
        code: block.code.toUpperCase(),
        title: block.title.trim(),
        summary: block.summary.trim(),
        body: block.content.trim(),
        slipTypeId: resolveSlipTypeId(slipTypes, block.slip || 'blue'),
        slipGivenTypeIds: resolveSlipGivenTypeIds(slipTypes, block.slipGiven),
        referencesText: block.references.join(', '),
        puzzleType: normalizePuzzleType(block.puzzle || 'none')
      }
    }

    updatedNodes.push(newNode)
    createdCount += 1
  }

  return {
    updatedNodes,
    updatedEdges: buildEdgesFromReferences(updatedNodes),
    createdCount,
    updatedCount
  }
}
