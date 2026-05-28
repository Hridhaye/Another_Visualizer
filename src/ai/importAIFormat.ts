import { buildEdgesFromReferences, enforceGivenSlipMinimums } from '../graph/buildEdgesFromReferences'
import type { NarrativeEdge, NarrativeNode, SlipType, Tag } from '../types/narrative'
import { PUZZLE_TYPES } from '../types/narrative'
import { parseAIBlocks } from './parseAIBlocks'
import { validateAIFormat } from './validateAIFormat'

export type AIImportResult = {
  updatedNodes: NarrativeNode[]
  updatedEdges: NarrativeEdge[]
  updatedTags: Tag[]
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

function normalizePuzzle(value: string): { puzzleType: (typeof PUZZLE_TYPES)[number]; puzzleSummary: string } {
  const raw = value.trim()

  if (!raw || /^none$/i.test(raw)) {
    return { puzzleType: 'none', puzzleSummary: '' }
  }

  const match = raw.match(/^([A-Za-z]+)\s*:\s*(.*)$/i)
  const puzzleType = normalizePuzzleType(match?.[1] ?? raw)
  const puzzleSummary = match?.[2]?.trim() ?? ''

  return { puzzleType, puzzleSummary }
}

export function importAIFormat(rawText: string, existingNodes: NarrativeNode[], slipTypes: SlipType[], existingTags: Tag[] = []): AIImportResult {
  const blocks = parseAIBlocks(rawText)
  const validation = validateAIFormat(blocks, existingNodes)

  if (!validation.ok) {
    throw new Error(validation.error)
  }

  const existingByCode = new Map(existingNodes.map((node) => [node.data.code.toUpperCase(), node]))
  const updatedNodes = existingNodes.map((node) => ({ ...node }))
  const tags: Tag[] = existingTags.map((tag) => ({ ...tag }))
  let createdCount = 0
  let updatedCount = 0

  // Resolve a tag name to an id, creating a new tag (in `tags`) on first sight.
  function resolveTagIds(names: string[]): string[] {
    const ids: string[] = []
    for (const rawName of names) {
      const name = rawName.trim()
      if (!name) continue
      let tag = tags.find((t) => t.name.toLowerCase() === name.toLowerCase())
      if (!tag) {
        tag = { id: crypto.randomUUID(), name }
        tags.push(tag)
      }
      if (!ids.includes(tag.id)) ids.push(tag.id)
    }
    return ids
  }

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
          tagIds: block.tags.length > 0
            ? resolveTagIds(block.tags)
            : (existing.data.tagIds ?? []),
          referencesText: block.references.join(', '),
          puzzleType: normalizePuzzle(block.puzzle || existing.data.puzzleType).puzzleType,
          puzzleSummary: normalizePuzzle(block.puzzle || existing.data.puzzleType).puzzleSummary
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
        tagIds: resolveTagIds(block.tags),
        referencesText: block.references.join(', '),
        puzzleType: normalizePuzzle(block.puzzle || 'none').puzzleType,
        puzzleSummary: normalizePuzzle(block.puzzle || 'none').puzzleSummary
      }
    }

    updatedNodes.push(newNode)
    createdCount += 1
  }

  // Toggled-on reference slip forms enforce a per-slip-type minimum on Slip Given.
  // The DSL carries totals but not the form flags, so top up any node that fell
  // below its minimum after import (e.g. a hand-edited SLIP_GIVEN line).
  const normalizedNodes = updatedNodes.map((node) => {
    const enforced = enforceGivenSlipMinimums(node, updatedNodes)
    if (enforced === node.data.slipGivenTypeIds) return node
    return { ...node, data: { ...node.data, slipGivenTypeIds: enforced } }
  })

  return {
    updatedNodes: normalizedNodes,
    updatedEdges: buildEdgesFromReferences(normalizedNodes),
    updatedTags: tags,
    createdCount,
    updatedCount
  }
}
