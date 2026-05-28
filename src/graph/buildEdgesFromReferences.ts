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
  const edges: NarrativeEdge[] = []

  nodes.forEach((sourceNode) => {
    const references = parseReferences(sourceNode.data.referencesText)

    references.forEach((referenceCode) => {
      const targetNode = nodes.find((candidate) => {
        return candidate.data.code === referenceCode
      })

      if (!targetNode || targetNode.id === sourceNode.id) {
        return
      }

      edges.push({
        id: `${sourceNode.id}-${targetNode.id}`,
        source: sourceNode.id,
        target: targetNode.id,
        type: 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed
        }
      })
    })
  })

  return edges
}
