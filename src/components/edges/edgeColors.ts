/**
 * Assigns a stable per-source-node stroke color to every edge, derived from
 * the source card's slip color.
 *
 * Lines from the same source share one color. When multiple source cards have
 * the same slip type, each gets a distinct opacity shade of that slip color so
 * they remain individually identifiable while still feeling related.
 *
 * Shade assignment within a slip group is stable: source IDs are sorted before
 * indexing, so the mapping doesn't shift when unrelated edges are added.
 */

/** Opacity levels used to differentiate sources that share a slip color. */
const SHADE_ALPHAS = [0.85, 0.55, 0.35, 0.2]

/** Fallback for cards with no slip color. */
const FALLBACK = 'rgba(148,163,184,0.75)'

export interface EdgeRef {
  edgeId: string
  source: string
  /** Hex color string of the source card's slip (e.g. "#3b82f6"). */
  slipColor: string
  /** ID of the slip type, used to group sources that share a slip. */
  slipTypeId: string
}

/** Parse "#rrggbb" or "#rgb" into [r, g, b] integers, or null on failure. */
function parseHex(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '')
  if (clean.length === 3) {
    const [r, g, b] = clean.split('').map((c) => parseInt(c + c, 16))
    return [r, g, b]
  }
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ]
  }
  return null
}

function hexToRgba(hex: string, alpha: number): string {
  const rgb = parseHex(hex)
  if (!rgb) return FALLBACK
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`
}

/**
 * Returns a map of edgeId -> stroke color.
 * Each source gets the slip's base color at a shade determined by how many
 * other sources share that same slip type.
 */
export function computeEdgeColors(edges: EdgeRef[]): Record<string, string> {
  // Group source node IDs by slip type. Sort within each group for stability.
  const sourcesBySlip = new Map<string, string[]>()
  const slipColorForType = new Map<string, string>()

  const uniqueSources = [...new Map(edges.map((e) => [e.source, e])).values()]
  uniqueSources.sort((a, b) => a.source.localeCompare(b.source))

  for (const { source, slipTypeId, slipColor } of uniqueSources) {
    const list = sourcesBySlip.get(slipTypeId) ?? []
    if (!list.includes(source)) list.push(source)
    sourcesBySlip.set(slipTypeId, list)
    slipColorForType.set(slipTypeId, slipColor)
  }

  // Assign a shade to each source node.
  const colorBySource = new Map<string, string>()
  for (const [slipTypeId, sources] of sourcesBySlip) {
    const baseHex = slipColorForType.get(slipTypeId) ?? ''
    sources.forEach((sourceId, i) => {
      const alpha = SHADE_ALPHAS[i % SHADE_ALPHAS.length]
      colorBySource.set(sourceId, hexToRgba(baseHex, alpha))
    })
  }

  const result: Record<string, string> = {}
  for (const edge of edges) {
    result[edge.edgeId] = colorBySource.get(edge.source) ?? FALLBACK
  }
  return result
}
