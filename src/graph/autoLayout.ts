import ELK from 'elkjs/lib/elk.bundled.js'
import type { NarrativeEdge, NarrativeNode } from '../types/narrative'

// Fallbacks used when a card hasn't been measured by ReactFlow yet (e.g. right
// after an import, before the DOM has laid the cards out). Matches the card box
// in styles/card.css so the layout reserves roughly the right footprint.
const DEFAULT_CARD_WIDTH = 483
const DEFAULT_CARD_HEIGHT = 200

const elk = new ELK()

// A measured-size lookup so layout reserves each card's real footprint. Keyed by
// node id; missing entries fall back to the default card box.
export type NodeSizes = Record<string, { width: number; height: number }>

// Generous, readable defaults: wide gaps between layers (the flow direction) and
// between siblings within a layer so connector lines have room to breathe.
const LAYOUT_OPTIONS: Record<string, string> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  // Space between consecutive layers (i.e. along the flow direction).
  'elk.layered.spacing.nodeNodeBetweenLayers': '640',
  // Space between sibling cards stacked within the same layer.
  'elk.spacing.nodeNode': '400',
  // Keep edges clear of nodes and of each other.
  'elk.spacing.edgeNode': '160',
  'elk.spacing.edgeEdge': '120',
  'elk.layered.spacing.edgeNodeBetweenLayers': '160',
  // Orthogonal routing reads as clean elbows that match the board's edges.
  'elk.edgeRouting': 'ORTHOGONAL',
  // Reduce crossings for legibility, then balance node placement in each layer.
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
}

/**
 * Computes tidy positions for the given board using ELK's layered algorithm.
 * Connected cards flow left-to-right in tiers with generous spacing so their
 * connector lines stay clear. Returns a map of nodeId -> new top-left position;
 * the caller applies it (so it can be made undoable in the store).
 *
 * Disconnected cards still get placed by ELK (it lays them out as their own
 * components), so nothing is left stacked on top of another card.
 */
export async function computeAutoLayout(
  nodes: NarrativeNode[],
  edges: NarrativeEdge[],
  sizes: NodeSizes = {}
): Promise<Record<string, { x: number; y: number }>> {
  if (nodes.length === 0) {
    return {}
  }

  const graph = {
    id: 'root',
    layoutOptions: LAYOUT_OPTIONS,
    children: nodes.map((node) => {
      const size = sizes[node.id]
      return {
        id: node.id,
        width: size?.width || node.width || DEFAULT_CARD_WIDTH,
        height: size?.height || node.height || DEFAULT_CARD_HEIGHT,
      }
    }),
    // Only edges between two known nodes — ELK throws on dangling endpoints.
    edges: edges
      .filter((edge) => edge.source && edge.target)
      .map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
      })),
  }

  const laid = await elk.layout(graph)

  const positions: Record<string, { x: number; y: number }> = {}
  for (const child of laid.children ?? []) {
    positions[child.id] = { x: child.x ?? 0, y: child.y ?? 0 }
  }
  return positions
}
