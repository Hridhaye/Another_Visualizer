import { useCallback, useEffect, useRef } from 'react'
import { useReactFlow } from 'reactflow'

import { useNarrativeBoardStore } from '../../store/useNarrativeBoardStore'
import { buildFloatingElbow, computeFloatingAnchors, polylineHitsObstacle } from './floatingEdge'
import { routeOrthogonal, type Point, type Rect } from './routeOrthogonal'

const DEBOUNCE_MS = 900

/**
 * Provides obstacle-avoidance routing that runs *on demand*, not every frame.
 *
 * `tidyLines()` runs A* once per edge using the current measured node rects and
 * stores the resulting polylines. It is wired to a manual button and to a long
 * debounce that fires only after card movement has settled — so dragging stays
 * cheap and A* never runs continuously.
 */
export function useTidyLines() {
  const { getNodes } = useReactFlow()
  const setRoutedPaths = useNarrativeBoardStore((state) => state.setRoutedPaths)

  const tidyLines = useCallback(() => {
    const nodes = getNodes()
    const edges = useNarrativeBoardStore.getState().edges

    const rects = new Map<string, Rect>()
    nodes.forEach((node) => {
      const pos = node.positionAbsolute ?? node.position
      const width = node.width ?? 0
      const height = node.height ?? 0
      if (!width || !height) return
      rects.set(node.id, { x: pos.x, y: pos.y, width, height })
    })

    const result: Record<string, Point[]> = {}
    edges.forEach((edge) => {
      const sourceRect = rects.get(edge.source)
      const targetRect = rects.get(edge.target)
      if (!sourceRect || !targetRect) return

      const anchors = computeFloatingAnchors(sourceRect, targetRect)
      const obstacles: Rect[] = []
      rects.forEach((rect, nodeId) => {
        if (nodeId !== edge.source && nodeId !== edge.target) obstacles.push(rect)
      })

      // Only override with A* when the clean floating elbow actually crosses a
      // card. When the elbow is already clear (the common case), leave this edge
      // out of routedPaths so the live elbow renders — A* tends to pick more
      // awkward entry sides/bends than the elbow when there's nothing to avoid.
      const elbow = buildFloatingElbow(anchors)
      if (!polylineHitsObstacle(elbow, obstacles)) return

      result[edge.id] = routeOrthogonal({
        source: anchors.source,
        target: anchors.target,
        sourcePosition: anchors.sourcePosition,
        targetPosition: anchors.targetPosition,
        obstacles,
      })
    })

    setRoutedPaths(result)
  }, [getNodes, setRoutedPaths])

  return tidyLines
}

/**
 * Re-runs tidyLines on a long debounce whenever the given signature changes
 * (node positions or edges). Slow on purpose: avoidance settles a beat after the
 * user stops moving things, never during interaction.
 *
 * On each change it first clears any existing routed paths so edges fall back to
 * the live floating elbow immediately (a stale A* polyline would otherwise stay
 * detached from a moved card until the debounce fires), then schedules the
 * re-route. The very first run is skipped so we don't auto-route on load.
 */
export function useAutoTidy(tidyLines: () => void, signature: string) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearRoutedPaths = useNarrativeBoardStore((state) => state.clearRoutedPaths)
  const firstRun = useRef(true)

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    clearRoutedPaths()
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(tidyLines, DEBOUNCE_MS)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [tidyLines, signature, clearRoutedPaths])
}
