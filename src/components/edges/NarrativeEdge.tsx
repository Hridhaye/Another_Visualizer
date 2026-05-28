import { createPortal } from 'react-dom'
import { getSmoothStepPath, BaseEdge, useViewport } from 'reactflow'
import type { EdgeProps } from 'reactflow'
import { useEdgeOverlay } from './EdgeOverlayContext'
import { useSelectedCardClip } from './useSelectedCardClip'

const MARKER_ID_BRIGHT = 'narrative-arrow-bright'

export function NarrativeEdgeMarkerDef() {
  return (
    <defs>
      <marker id={MARKER_ID_BRIGHT} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L0,8 L8,4 z" fill="rgba(255,255,255,0.85)" />
      </marker>
    </defs>
  )
}

function HighlightedPath({
  overlayEl,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  shift,
  clipId,
}: {
  overlayEl: HTMLElement
  sourceX: number; sourceY: number
  targetX: number; targetY: number
  sourcePosition: string; targetPosition: string
  shift: number
  clipId: string
}) {
  const { x, y, zoom } = useViewport()
  const clip = useSelectedCardClip(clipId)

  const [path] = getSmoothStepPath({
    sourceX,
    sourceY: sourceY + shift,
    sourcePosition: sourcePosition as never,
    targetX,
    targetY: targetY + shift,
    targetPosition: targetPosition as never,
    borderRadius: 0,
    offset: 40 + Math.abs(shift),
  })

  return createPortal(
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 10, mixBlendMode: 'screen' }}>
      <NarrativeEdgeMarkerDef />
      {clip?.clipDef}
      <g clipPath={clip?.clipUrl}>
        <g style={{ transform: `translate(${x}px, ${y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
          <path
            d={path}
            fill="none"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth={2.5}
            markerEnd={`url(#${MARKER_ID_BRIGHT})`}
            style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' }}
          />
        </g>
      </g>
    </svg>,
    overlayEl
  )
}

export function NarrativeEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) {
  const shift: number = data?.lateralShift ?? 0
  const isHighlighted: boolean = data?.isOutgoingFromSelected ?? false
  const overlayEl = useEdgeOverlay()

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY: sourceY + shift,
    sourcePosition,
    targetX,
    targetY: targetY + shift,
    targetPosition,
    borderRadius: 0,
    offset: 40 + Math.abs(shift),
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: 'rgba(148,163,184,0.45)',
          strokeWidth: 1.5,
          transition: 'stroke 0.15s ease',
        }}
      />
      {isHighlighted && overlayEl && (
        <HighlightedPath
          overlayEl={overlayEl}
          sourceX={sourceX}
          sourceY={sourceY}
          targetX={targetX}
          targetY={targetY}
          sourcePosition={sourcePosition}
          targetPosition={targetPosition}
          shift={shift}
          clipId={`clip-narrative-${id}`}
        />
      )}
    </>
  )
}
