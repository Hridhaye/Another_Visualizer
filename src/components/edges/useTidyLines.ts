import { useCallback, useEffect } from 'react'
import { useReactFlow } from 'reactflow'

import { getSlipColor, HIGHLIGHT_SCALE, useNarrativeBoardStore } from '../../store/useNarrativeBoardStore'
import { bundleEdgesBySource, type EdgeEndpoints, type RouteTail } from './bundleEdges'
import { computeEdgeColors, type EdgeRef } from './edgeColors'
import { buildFloatingElbow, computeFloatingAnchors, inflateRect, polylineHitsObstacle } from './floatingEdge'
import {
  orthogonalize,
  routeOrthogonal,
  simplify,
  type Point,
  type Rect,
} from './routeOrthogonal'

function buildEdgeRefs(): EdgeRef[] {
  const { edges, nodes, slipTypes } = useNarrativeBoardStore.getState()
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  return edges.map((e) => {
    const sourceNode = nodeById.get(e.source)
    const slipTypeId = sourceNode?.data.slipTypeId ?? ''
    return {
      edgeId: e.id,
      source: e.source,
      slipTypeId,
      slipColor: getSlipColor(slipTypes, slipTypeId),
    }
  })
}

/**
 * Provides obstacle-avoidance routing that runs *on demand*, not every frame.
 *
 * `tidyLines()` runs A* once per edge using the current measured node rects and
 * stores the resulting polylines. It is wired to a manual button and to a long
 * debounce that fires only after card movement has settled — so dragging stays
 * cheap and A* never runs continuously.
 */
export function useTidyLines() {
  const { getNodes, getViewport } = useReactFlow()
  const setRoutedPaths = useNarrativeBoardStore((state) => state.setRoutedPaths)
  const setEdgeColors = useNarrativeBoardStore((state) => state.setEdgeColors)

  const tidyLines = useCallback(() => {
    const nodes = getNodes()
    const edges = useNarrativeBoardStore.getState().edges
    const { zoom } = getViewport()

    // Highlighted cards are grown with a centered CSS transform that doesn't change
    // the measured box, so inflate their rect by the same factor — otherwise the
    // A* route would anchor (and the arrow/dot markers would land) under the card.
    const highlightedNodeIds = useNarrativeBoardStore.getState().highlightedNodeIds
    const rects = new Map<string, Rect>()
    nodes.forEach((node) => {
      const pos = node.positionAbsolute ?? node.position
      const width = node.width ?? 0
      const height = node.height ?? 0
      if (!width || !height) return
      const rect = { x: pos.x, y: pos.y, width, height }
      const scale = highlightedNodeIds.includes(node.id) ? HIGHLIGHT_SCALE : 1
      rects.set(node.id, inflateRect(rect, scale) ?? rect)
    })

    const bundleEdges = useNarrativeBoardStore.getState().bundleEdges

    // Tail re-router: when a bundled line's final leg (trunk branch -> target)
    // would cross a card, the bundler hands that leg here for A* avoidance while
    // keeping the shared exit/trunk/branch intact.
    const routeTail: RouteTail = ({ from, fromPosition, target, targetPosition, obstacles }) =>
      routeOrthogonal({
        source: from,
        target,
        sourcePosition: fromPosition,
        targetPosition,
        obstacles,
      })

    // Trunk-bundled polylines (source-grouped, fanned exits + shared spine, with
    // a clear trunk lane and obstacle-avoiding tails) for every routable edge.
    // When bundling is off this stays empty and each edge falls back to its
    // independent elbow / A* route below.
    const endpoints: EdgeEndpoints[] = edges.map((e) => ({
      edgeId: e.id,
      source: e.source,
      target: e.target,
    }))
    const bundled = bundleEdges ? bundleEdgesBySource(endpoints, rects, routeTail, zoom) : {}

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

      // Preferred path: the bundled polyline. It already routes a clear trunk
      // lane and avoids cards on its tails, so use it as-is (orthogonalized so the
      // exit/branch joins stay axis-aligned). This keeps same-source lines sharing
      // a trunk before diverging, even when a card blocks a straight branch.
      const bundledRaw = bundled[edge.id]
      if (bundledRaw && bundledRaw.length >= 2) {
        result[edge.id] = simplify(orthogonalize(bundledRaw, anchors.sourcePosition))
        return
      }

      // Bundling off (or edge not bundled): only override with A* when the clean
      // floating elbow actually crosses a card. When the elbow is already clear,
      // leave this edge out of routedPaths so the live elbow renders.
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
    setEdgeColors(computeEdgeColors(buildEdgeRefs()))
  }, [getNodes, getViewport, setRoutedPaths, setEdgeColors])

  return tidyLines
}

/**
 * Keeps edgeColors in sync with the current edge list + palette.
 *
 * Edge color depends only on: which edges exist, each source card's slip type,
 * and the slip palette. None of those change while dragging, panning, or
 * zooming — and the `edges` array only gets a new identity when topology or a
 * source's slip type actually changes (edges are regenerated from references on
 * those edits). So a plain `useEffect([edges, slipTypes])` recomputes exactly
 * when needed and never on the drag/pan hot path. (Reads fresh node data via
 * getState() inside buildEdgeRefs, so it doesn't need to subscribe to nodes.)
 */
export function useSyncEdgeColors(edges: unknown, slipTypes: unknown) {
  const setEdgeColors = useNarrativeBoardStore((state) => state.setEdgeColors)
  useEffect(() => {
    setEdgeColors(computeEdgeColors(buildEdgeRefs()))
  }, [edges, slipTypes, setEdgeColors])
}
