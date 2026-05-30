import { useCallback } from 'react'
import { useStoreApi } from 'reactflow'

import { useNarrativeBoardStore } from '../store/useNarrativeBoardStore'
import { computeAutoLayout, type NodeSizes } from '../graph/autoLayout'

// How long to wait for freshly-mounted cards to be measured before laying out
// anyway. Cards are content-height (min-height: 157px in card.css), so a big card
// can be 600px+ tall — laying it out before it's measured reserves only the
// default 200px box and the next card overlaps it. We poll the measured store
// until every node has a real height (or we hit this budget).
const MEASURE_TIMEOUT_MS = 2000
const MEASURE_POLL_MS = 50

/**
 * Reads each card's measured box from ReactFlow's internal store. ReactFlow stores
 * these in flow units (zoom-independent), so they're the true footprint regardless
 * of pan/zoom — unlike a DOM getBoundingClientRect, which is scaled by zoom.
 *
 * Returns null entries for nodes that haven't been measured yet (width/height are
 * undefined until the ResizeObserver fires after first paint).
 */
function readMeasuredSizes(
  nodeInternals: Map<string, { width?: number | null; height?: number | null }>
): { sizes: NodeSizes; allMeasured: boolean } {
  const sizes: NodeSizes = {}
  let allMeasured = true
  for (const [id, node] of nodeInternals) {
    if (node.width && node.height) {
      sizes[id] = { width: node.width, height: node.height }
    } else {
      allMeasured = false
    }
  }
  return { sizes, allMeasured }
}

/**
 * Arranges every card into a tidy left-to-right flow with generous spacing so
 * connected cards and their connector lines stay legible — replacing the diagonal
 * "stacked" cascade that fresh imports / Add Card produce.
 *
 * Cards are variable height (content-driven), so the layout MUST use each card's
 * real measured height — otherwise tall cards get only the default box reserved
 * and their neighbours overlap them. We wait for measurement before laying out.
 */
export function useAutoArrange() {
  const storeApi = useStoreApi()
  const applyAutoLayout = useNarrativeBoardStore((state) => state.applyAutoLayout)

  return useCallback(async () => {
    const { nodes, edges } = useNarrativeBoardStore.getState()
    if (nodes.length === 0) {
      return
    }

    // Wait until ReactFlow has measured every card (heights vary with content, so
    // we can't guess them). Poll the internal store, which updates as the
    // ResizeObserver reports each card's box. Bail out after a budget so a single
    // stuck card can't block the arrange forever — it just falls back to default.
    const deadline = Date.now() + MEASURE_TIMEOUT_MS
    let sizes: NodeSizes = {}
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { nodeInternals } = storeApi.getState()
      const measured = readMeasuredSizes(nodeInternals)
      sizes = measured.sizes
      if (measured.allMeasured || Date.now() >= deadline) {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, MEASURE_POLL_MS))
    }

    const positions = await computeAutoLayout(nodes, edges, sizes)
    applyAutoLayout(positions)
  }, [applyAutoLayout, storeApi])
}
