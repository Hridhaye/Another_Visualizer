import { useRef } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'

import { ContextPanel } from './ContextPanel'
import { getSlipColor, useNarrativeBoardStore } from '../store/useNarrativeBoardStore'
import type { CardData } from '../types/narrative'

const HOLD_MS = 180
const DRIFT_PX = 6

export function NarrativeCardNode({ id, data, selected }: NodeProps<CardData>) {
  void selected
  const slipTypes = useNarrativeBoardStore((state) => state.slipTypes)
  const selectedNodeId = useNarrativeBoardStore((state) => state.selectedNodeId)
  const connectionSourceNodeId = useNarrativeBoardStore((state) => state.connectionSourceNodeId)
  const contextPanelOpen = useNarrativeBoardStore((state) => state.contextPanelOpen)
  const openContextPanel = useNarrativeBoardStore((state) => state.openContextPanel)
  const closeContextPanel = useNarrativeBoardStore((state) => state.closeContextPanel)
  const updateNode = useNarrativeBoardStore((state) => state.updateNode)
  const deleteCard = useNarrativeBoardStore((state) => state.deleteCard)
  const setConnectionSourceNode = useNarrativeBoardStore((state) => state.setConnectionSourceNode)
  const createReferenceConnection = useNarrativeBoardStore((state) => state.createReferenceConnection)
  const setLinkDrag = useNarrativeBoardStore((state) => state.setLinkDrag)
  const linkDragSourceId = useNarrativeBoardStore((state) => state.linkDragSourceId)
  const linkDragTargetId = useNarrativeBoardStore((state) => state.linkDragTargetId)
  const nodes = useNarrativeBoardStore((state) => state.nodes)
  const thisNode = nodes.find((n) => n.id === id)

  const slipColor = getSlipColor(slipTypes, data.slipTypeId)
  const isLinkSource = connectionSourceNodeId === id
  const isSelected = selectedNodeId === id
  const showContextPanel = isSelected && contextPanelOpen && !!thisNode

  const isDragSource = linkDragSourceId === id
  const isDragTarget = linkDragTargetId === id

  // hold-to-link gesture state (not in store — purely ephemeral pointer tracking)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const downPos = useRef<{ x: number; y: number } | null>(null)
  const linkDragActive = useRef(false)
  const suppressClick = useRef(false)

  function getCardIdAtPoint(x: number, y: number): string | null {
    const els = document.elementsFromPoint(x, y)
    for (const el of els) {
      const node = (el as HTMLElement).closest('[data-card-id]') as HTMLElement | null
      if (node) {
        const candidate = node.dataset.cardId
        if (candidate && candidate !== id) return candidate
      }
    }
    return null
  }

  function cancelHold() {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  function endLinkDrag(clientX: number, clientY: number) {
    cancelHold()
    if (!linkDragActive.current) return
    linkDragActive.current = false
    suppressClick.current = true

    const targetId = getCardIdAtPoint(clientX, clientY)
    setLinkDrag(null, null)

    if (targetId) {
      createReferenceConnection(id, targetId)
    }

    // allow the next click through after a tick (prevents phantom select)
    setTimeout(() => { suppressClick.current = false }, 0)
  }

  function onPointerDown(e: React.PointerEvent) {
    // only primary button / first touch
    if (e.button !== undefined && e.button !== 0) return
    downPos.current = { x: e.clientX, y: e.clientY }
    linkDragActive.current = false

    holdTimer.current = setTimeout(() => {
      linkDragActive.current = true
      setLinkDrag(id, null)
    }, HOLD_MS)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!downPos.current) return

    if (!linkDragActive.current) {
      // cancel hold if pointer drifted too much (user is panning/dragging node)
      const dx = e.clientX - downPos.current.x
      const dy = e.clientY - downPos.current.y
      if (Math.sqrt(dx * dx + dy * dy) > DRIFT_PX) {
        cancelHold()
        downPos.current = null
      }
      return
    }

    // update hover target
    const targetId = getCardIdAtPoint(e.clientX, e.clientY)
    setLinkDrag(id, targetId)
  }

  function onPointerUp(e: React.PointerEvent) {
    downPos.current = null
    endLinkDrag(e.clientX, e.clientY)
  }

  function onPointerCancel() {
    cancelHold()
    if (linkDragActive.current) {
      linkDragActive.current = false
      setLinkDrag(null, null)
    }
    downPos.current = null
  }

  function handleClick() {
    if (suppressClick.current) return
    if (connectionSourceNodeId) return   // handled by App-level onNodeClick
    openContextPanel()
  }

  // visual state
  let extraShadow = ''
  if (isDragSource) {
    extraShadow = ', 0 0 0 3px rgba(99,102,241,0.8)'
  } else if (isDragTarget) {
    extraShadow = ', 0 0 0 3px rgba(34,197,94,0.85)'
  }

  return (
    <div
      data-card-id={id}
      className={`card-shell relative ${isSelected ? 'card-selected' : ''}`}
      style={{
        border: `6px solid ${slipColor}`,
        backgroundColor: '#18181b',
        backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.03), rgba(255,255,255,0))',
        boxShadow: isSelected
          ? `0 0 0 2px rgba(59,130,246,0.45), 0 12px 34px rgba(0,0,0,0.5), inset 0 0 80px ${slipColor}22${extraShadow}`
          : `0 0 0 2px rgba(255,255,255,0.04), inset 0 0 80px ${slipColor}22${extraShadow}`,
        cursor: isDragSource ? 'crosshair' : undefined
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={handleClick}
    >
      {showContextPanel && (
        <ContextPanel
          node={thisNode}
          allNodes={nodes}
          slipTypes={slipTypes}
          isLinkSource={isLinkSource}
          onUpdate={updateNode}
          onDelete={deleteCard}
          onClose={closeContextPanel}
          onToggleLink={() => setConnectionSourceNode(isLinkSource ? null : id)}
        />
      )}

      <Handle type="target" position={Position.Left} />

      <div className="card-header">
        <div className="card-code">{data.code}</div>
        <div className="card-title">{data.title}</div>
      </div>

      <div className="card-summary">{data.summary}</div>

      {data.referencesText && (
        <div className="mt-4 border-t border-zinc-700 pt-3 text-sm text-zinc-400">
          References: {data.referencesText}
        </div>
      )}

      {isDragSource && (
        <div className="absolute -top-7 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-indigo-700/60 bg-indigo-950/90 px-2.5 py-1 text-[10px] font-semibold text-indigo-300 shadow-lg">
          {isDragTarget ? 'Release to link' : 'Drag to a card to link'}
        </div>
      )}

      {isDragTarget && (
        <div className="absolute inset-0 rounded-[inherit] pointer-events-none ring-2 ring-emerald-400/70" />
      )}

      {isLinkSource && (
        <div className="absolute -top-4 right-4 z-50 flex items-center gap-2">
          <div className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 shadow-lg">
            Click another card to connect
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  )
}
