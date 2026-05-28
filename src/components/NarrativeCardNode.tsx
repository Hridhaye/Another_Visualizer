import { useCallback, useEffect, useRef } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'

import { ContextPanel } from './ContextPanel'
import { getSlipColor, useNarrativeBoardStore } from '../store/useNarrativeBoardStore'
import type { CardData } from '../types/narrative'

const HOLD_MS = 180
// How many px of movement cancels the hold timer (normal drag/pan tolerance)
const DRIFT_PX = 8

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

  // Ephemeral gesture state — none of this belongs in the store
  const divRef = useRef<HTMLDivElement | null>(null)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const downPos = useRef<{ x: number; y: number } | null>(null)
  const linkDragActive = useRef(false)
  const suppressNextClick = useRef(false)

  // Keep a stable ref to setLinkDrag so the touch handlers (attached once) don't stale-close
  const setLinkDragRef = useRef(setLinkDrag)
  const createRefRef = useRef(createReferenceConnection)
  useEffect(() => { setLinkDragRef.current = setLinkDrag }, [setLinkDrag])
  useEffect(() => { createRefRef.current = createReferenceConnection }, [createReferenceConnection])

  function getCardIdAtPoint(x: number, y: number): string | null {
    const els = document.elementsFromPoint(x, y)
    for (const el of els) {
      const node = (el as HTMLElement).closest('[data-card-id]') as HTMLElement | null
      if (node?.dataset.cardId && node.dataset.cardId !== id) {
        return node.dataset.cardId
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

  function commitLinkDrag(clientX: number, clientY: number) {
    linkDragActive.current = false
    divRef.current?.classList.remove('nodrag')
    suppressNextClick.current = true
    const targetId = getCardIdAtPoint(clientX, clientY)
    setLinkDragRef.current(null, null)
    if (targetId) createRefRef.current(id, targetId)
    // clear suppress after the synthetic click that follows touch/mouseup fires
    setTimeout(() => { suppressNextClick.current = false }, 0)
  }

  function abortLinkDrag() {
    linkDragActive.current = false
    divRef.current?.classList.remove('nodrag')
    setLinkDragRef.current(null, null)
  }

  // ── Imperative touch listeners (passive:false lets us preventDefault) ──
  // Attached once on mount to the card div so we can call preventDefault
  // on touchmove/touchend before the browser hands the gesture to ReactFlow.
  const handleTouchMove = useCallback((e: TouchEvent) => {
    const t = e.touches[0]
    if (!t) return

    if (!linkDragActive.current) {
      if (!downPos.current) return
      const dx = t.clientX - downPos.current.x
      const dy = t.clientY - downPos.current.y
      if (Math.sqrt(dx * dx + dy * dy) > DRIFT_PX) {
        // Too much drift before hold — cancel and let ReactFlow pan
        cancelHold()
        downPos.current = null
      }
      return
    }

    // Hold is active: take ownership of this touch, stop pan
    e.preventDefault()
    e.stopPropagation()
    const targetId = getCardIdAtPoint(t.clientX, t.clientY)
    setLinkDragRef.current(id, targetId)
  }, [id])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!linkDragActive.current) {
      cancelHold()
      downPos.current = null
      return
    }
    e.preventDefault()
    e.stopPropagation()
    const t = e.changedTouches[0]
    if (t) commitLinkDrag(t.clientX, t.clientY)
    downPos.current = null
  }, [id])

  const handleTouchCancel = useCallback(() => {
    cancelHold()
    if (linkDragActive.current) abortLinkDrag()
    downPos.current = null
  }, [])

  useEffect(() => {
    const el = divRef.current
    if (!el) return
    // passive:false is required to be able to call preventDefault in these handlers
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: false })
    el.addEventListener('touchcancel', handleTouchCancel)
    return () => {
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
      el.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [handleTouchMove, handleTouchEnd, handleTouchCancel])

  // ── React synthetic pointer handlers (mouse + pointer-device fallback) ──
  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'touch') return  // handled by native touch listeners above
    if (e.button !== 0) return
    downPos.current = { x: e.clientX, y: e.clientY }
    linkDragActive.current = false

    holdTimer.current = setTimeout(() => {
      linkDragActive.current = true
      divRef.current?.classList.add('nodrag')
      setLinkDragRef.current(id, null)
    }, HOLD_MS)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (e.pointerType === 'touch') return
    if (!downPos.current) return

    if (!linkDragActive.current) {
      const dx = e.clientX - downPos.current.x
      const dy = e.clientY - downPos.current.y
      if (Math.sqrt(dx * dx + dy * dy) > DRIFT_PX) {
        cancelHold()
        downPos.current = null
      }
      return
    }

    const targetId = getCardIdAtPoint(e.clientX, e.clientY)
    setLinkDragRef.current(id, targetId)
  }

  function onPointerUp(e: React.PointerEvent) {
    if (e.pointerType === 'touch') return
    downPos.current = null
    if (!linkDragActive.current) { cancelHold(); return }
    commitLinkDrag(e.clientX, e.clientY)
  }

  function onPointerCancel(e: React.PointerEvent) {
    if (e.pointerType === 'touch') return
    cancelHold()
    if (linkDragActive.current) abortLinkDrag()
    downPos.current = null
  }

  // touchstart via React synthetic (passive) — just records start position and
  // kicks off the hold timer; actual gesture capture happens in the native listeners
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    if (!t) return
    downPos.current = { x: t.clientX, y: t.clientY }
    linkDragActive.current = false

    holdTimer.current = setTimeout(() => {
      linkDragActive.current = true
      divRef.current?.classList.add('nodrag')
      setLinkDragRef.current(id, null)
    }, HOLD_MS)
  }

  function handleClick() {
    if (suppressNextClick.current) return
    if (connectionSourceNodeId) return
    openContextPanel()
  }

  let extraShadow = ''
  if (isDragSource) extraShadow = ', 0 0 0 3px rgba(99,102,241,0.85)'
  else if (isDragTarget) extraShadow = ', 0 0 0 3px rgba(34,197,94,0.85)'

  return (
    <div
      ref={divRef}
      data-card-id={id}
      className={`card-shell relative ${isSelected ? 'card-selected' : ''}`}
      style={{
        border: `6px solid ${slipColor}`,
        backgroundColor: '#18181b',
        backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.03), rgba(255,255,255,0))',
        boxShadow: isSelected
          ? `0 0 0 2px rgba(59,130,246,0.45), 0 12px 34px rgba(0,0,0,0.5), inset 0 0 80px ${slipColor}22${extraShadow}`
          : `0 0 0 2px rgba(255,255,255,0.04), inset 0 0 80px ${slipColor}22${extraShadow}`,
        cursor: isDragSource ? 'crosshair' : undefined,
        // Disable browser touch-action while link drag is active so
        // the OS scroll/zoom gesture doesn't compete
        touchAction: linkDragActive.current ? 'none' : undefined,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onTouchStart={onTouchStart}
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
          {linkDragTargetId ? 'Release to link' : 'Drag to a card to link'}
        </div>
      )}

      {isDragTarget && (
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] ring-2 ring-emerald-400/70" />
      )}

      {isLinkSource && (
        <div className="absolute -top-4 right-4 z-50">
          <div className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 shadow-lg">
            Click another card to connect
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  )
}
