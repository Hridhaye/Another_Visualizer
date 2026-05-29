import { useCallback, useRef } from 'react'
import type React from 'react'

import { useNarrativeBoardStore } from '../../store/useNarrativeBoardStore'
import type { Axis } from './edgeOffset'

/**
 * Drives dragging of an edge's middle segment using Pointer Events.
 *
 * Pointer Events (not mouse events) are used because ReactFlow's pan/zoom is
 * driven by pointer events at the pane level — listening for mouse events lets
 * the pane start panning before our handler runs, especially on touch devices.
 * `setPointerCapture` routes every subsequent move/up to this element regardless
 * of what's underneath, and `stopPropagation` keeps the pane from seeing the
 * gesture at all. This makes dragging behave identically on desktop and touch.
 */
export function useSegmentDrag(params: {
  edgeId: string
  startOffset: number
  axis: Axis
}): (event: React.PointerEvent) => void {
  // Keep the latest values in a ref so the returned handler is stable but never stale.
  const latest = useRef(params)
  latest.current = params

  return useCallback((event: React.PointerEvent) => {
    // Only react to the primary button / single touch.
    if (event.button !== 0 && event.pointerType === 'mouse') {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    const target = event.currentTarget as HTMLElement | SVGElement
    target.setPointerCapture?.(event.pointerId)

    const { edgeId, startOffset, axis } = latest.current
    const startClient = axis === 'vertical' ? event.clientX : event.clientY
    const zoom = useNarrativeBoardStore.getState().viewport.zoom || 1
    const setEdgeOffset = useNarrativeBoardStore.getState().setEdgeOffset

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== event.pointerId) {
        return
      }
      const currentClient = axis === 'vertical' ? moveEvent.clientX : moveEvent.clientY
      const delta = (currentClient - startClient) / zoom
      setEdgeOffset(edgeId, startOffset + delta)
    }

    const finish = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== event.pointerId) {
        return
      }
      target.releasePointerCapture?.(event.pointerId)
      target.removeEventListener('pointermove', onPointerMove as EventListener)
      target.removeEventListener('pointerup', finish as EventListener)
      target.removeEventListener('pointercancel', finish as EventListener)
    }

    target.addEventListener('pointermove', onPointerMove as EventListener)
    target.addEventListener('pointerup', finish as EventListener)
    target.addEventListener('pointercancel', finish as EventListener)
  }, [])
}
