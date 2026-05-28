import { MarkerType } from 'reactflow'

import type { NarrativeEdge, NarrativeNode } from '../types/narrative'

export function parseReferences(referencesText: string): string[] {
  return referencesText
    .split(',')
    .map((reference) => reference.trim())
    .filter(Boolean)
}

export function buildEdgesFromReferences(
  nodes: NarrativeNode[]
): NarrativeEdge[] {
  // First pass: collect all directed pairs
  const directedPairs: Array<{ sourceId: string; targetId: string }> = []

  nodes.forEach((sourceNode) => {
    const references = parseReferences(sourceNode.data.referencesText)

    references.forEach((referenceCode) => {
      const targetNode = nodes.find((candidate) => {
        return candidate.data.code === referenceCode
      })

      if (!targetNode || targetNode.id === sourceNode.id) {
        return
      }

      directedPairs.push({ sourceId: sourceNode.id, targetId: targetNode.id })
    })
  })

  // Build a set of pair keys for quick bidirectional lookup
  const pairSet = new Set(directedPairs.map((p) => `${p.sourceId}->${p.targetId}`))

  const edges: NarrativeEdge[] = []
  const emittedBidirectional = new Set<string>()

  directedPairs.forEach(({ sourceId, targetId }) => {
    const reverseKey = `${targetId}->${sourceId}`
    const isBidirectional = pairSet.has(reverseKey)

    if (isBidirectional) {
      // Emit only one edge per bidirectional pair, keyed by sorted ids to avoid duplicates
      const canonicalKey = [sourceId, targetId].sort().join('--')
      if (emittedBidirectional.has(canonicalKey)) return
      emittedBidirectional.add(canonicalKey)

      edges.push({
        id: `bidir-${canonicalKey}`,
        source: sourceId,
        target: targetId,
        type: 'bidirectional',
        data: { bidirectional: true }
      })
    } else {
      edges.push({
        id: `${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        type: 'narrativeEdge',
        markerEnd: {
          type: MarkerType.ArrowClosed
        },
        data: { bidirectional: false }
      })
    }
  })

  return edges
}
