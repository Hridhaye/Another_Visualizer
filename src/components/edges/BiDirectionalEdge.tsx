import { createPortal } from 'react-dom'
import { getSmoothStepPath, useViewport } from 'reactflow'
import type { EdgeProps } from 'reactflow'
import { useEdgeOverlay } from './EdgeOverlayContext'

const MARKER_DIM = 'bidir-arrow-dim'
const MARKER_BRIGHT = 'bidir-arrow-bright'

export function BiDirectionalEdgeMarkerDef() {
  return (
    <defs>
      <marker id={MARKER_DIM} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L0,8 L8,4 z" fill="rgba(148,163,184,0.55)" />
      </marker>
      <marker id={MARKER_BRIGHT} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L0,8 L8,4 z" fill="rgba(255,255,255,0.85)" />
      </marker>
    </defs>
  )
}

function buildPaths(
  sourceX: number, sourceY: number, sourcePosition: string,
  targetX: number, targetY: number, targetPosition: string,
  shift: number
) {
  const offset = 40 + Math.abs(shift)
  const [forward] = getSmoothStepPath({
    sourceX, sourceY: sourceY + shift, sourcePosition: sourcePosition as never,
    targetX, targetY: targetY + shift, targetPosition: targetPosition as never,
    borderRadius: 0, offset,
  })
  const [reverse] = getSmoothStepPath({
    sourceX: targetX, sourceY: targetY + shift, sourcePosition: targetPosition as never,
    targetX: sourceX, targetY: sourceY + shift, targetPosition: sourcePosition as never,
    borderRadius: 0, offset,
  })
  return { forward, reverse }
}

function HighlightedBidirPath({
  overlayEl,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, shift,
}: {
  overlayEl: HTMLElement
  sourceX: number; sourceY: number
  targetX: number; targetY: number
  sourcePosition: string; targetPosition: string
  shift: number
}) {
  const { x, y, zoom } = useViewport()
  const { forward, reverse } = buildPaths(sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, shift)

  return createPortal(
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 10, mixBlendMode: 'screen' }}>
      <BiDirectionalEdgeMarkerDef />
      <g style={{ transform: `translate(${x}px, ${y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
        <path
          d={forward}
          fill="none"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth={3}
          markerEnd={`url(#${MARKER_BRIGHT})`}
          style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' }}
        />
        <path
          d={reverse}
          fill="none"
          stroke="transparent"
          strokeWidth={3}
          markerEnd={`url(#${MARKER_BRIGHT})`}
        />
      </g>
    </svg>,
    overlayEl
  )
}

export function BiDirectionalEdge({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data,
}: EdgeProps) {
  const shift: number = data?.lateralShift ?? 0
  const isHighlighted: boolean = data?.isOutgoingFromSelected ?? false
  const overlayEl = useEdgeOverlay()

  const { forward, reverse } = buildPaths(sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, shift)

  return (
    <>
      <path
        d={forward}
        fill="none"
        stroke="rgba(148,163,184,0.55)"
        strokeWidth={2.5}
        markerEnd={`url(#${MARKER_DIM})`}
      />
      <path
        d={reverse}
        fill="none"
        stroke="transparent"
        strokeWidth={2.5}
        markerEnd={`url(#${MARKER_DIM})`}
      />
      {isHighlighted && overlayEl && (
        <HighlightedBidirPath
          overlayEl={overlayEl}
          sourceX={sourceX} sourceY={sourceY}
          targetX={targetX} targetY={targetY}
          sourcePosition={sourcePosition}
          targetPosition={targetPosition}
          shift={shift}
        />
      )}
    </>
  )
}
