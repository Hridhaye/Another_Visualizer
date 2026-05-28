import { useCallback, useEffect, useRef } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'

import { ContextPanel } from './ContextPanel'
import { getSlipColor, useNarrativeBoardStore } from '../store/useNarrativeBoardStore'
import type { CardData } from '../types/narrative'

const LONG_PRESS_MS = 400
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
  const nodes = useNarrativeBoardStore((state) => state.nodes)
  const thisNode = nodes.find((n) => n.id === id)

  const slipColor = getSlipColor(slipTypes, data.slipTypeId)
  const isLinkSource = connectionSourceNodeId === id
  const isSelected = selectedNodeId === id
  const isPendingTarget = !!connectionSourceNodeId && !isLinkSource
  const showContextPanel = isSelected && contextPanelOpen && !!thisNode

  // ── Touch long-press state ───────────────────────────────────────────
  const divRef = useRef<HTMLDivElement | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartPos = useRef<{ x: number; y: number } | null>(null)
  const longPressActivated = useRef(false)

  // Stable refs so the imperative listeners don't go stale
  const connectionSourceRef = useRef(connectionSourceNodeId)
  const setConnectionRef = useRef(setConnectionSourceNode)
  const createRefConnection = useRef(createReferenceConnection)
  useEffect(() => { connectionSourceRef.current = connectionSourceNodeId }, [connectionSourceNodeId])
  useEffect(() => { setConnectionRef.current = setConnectionSourceNode }, [setConnectionSourceNode])
  useEffect(() => { createRefConnection.current = createReferenceConnection }, [createReferenceConnection])

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const t = e.touches[0]
    if (!t || !touchStartPos.current) return

    if (!longPressActivated.current) {
      const dx = t.clientX - touchStartPos.current.x
      const dy = t.clientY - touchStartPos.current.y
      if (Math.sqrt(dx * dx + dy * dy) > DRIFT_PX) {
        // Finger moved before hold fired — cancel and let ReactFlow pan
        cancelLongPress()
        touchStartPos.current = null
      }
      return
    }

    // Long press is active: own the touch, block camera pan
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    cancelLongPress()
    touchStartPos.current = null

    if (!longPressActivated.current) return
    longPressActivated.current = false

    // Treat the finger-lift as the "tap" that completes or initiates a link
    e.preventDefault()
    e.stopPropagation()

    const source = connectionSourceRef.current
    if (!source) {
      // Long press set us as source already; nothing more to do on lift
      return
    }
    if (source !== id) {
      // Lifting on a different card while a source is set → complete the link
      createRefConnection.current(source, id)
      setConnectionRef.current(null)
    }
  }, [id])

  const handleTouchCancel = useCallback(() => {
    cancelLongPress()
    longPressActivated.current = false
    touchStartPos.current = null
  }, [])

  useEffect(() => {
    const el = divRef.current
    if (!el) return
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: false })
    el.addEventListener('touchcancel', handleTouchCancel)
    return () => {
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
      el.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [handleTouchMove, handleTouchEnd, handleTouchCancel])

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    if (!t) return
    touchStartPos.current = { x: t.clientX, y: t.clientY }
    longPressActivated.current = false

    longPressTimer.current = setTimeout(() => {
      longPressActivated.current = true
      // Set this card as the link source
      setConnectionRef.current(id)
    }, LONG_PRESS_MS)
  }

  // ── Mouse / desktop: alt+click ───────────────────────────────────────
  function handleClick(e: React.MouseEvent) {
    if (e.altKey) {
      e.preventDefault()
      e.stopPropagation()

      if (!connectionSourceNodeId) {
        setConnectionSourceNode(id)
      } else if (connectionSourceNodeId === id) {
        setConnectionSourceNode(null)
      } else {
        createReferenceConnection(connectionSourceNodeId, id)
        setConnectionSourceNode(null)
      }
      return
    }

    // Normal click — cancel any pending link mode, open context panel
    if (connectionSourceNodeId) {
      setConnectionSourceNode(null)
      return
    }

    openContextPanel()
  }

  // ── Touch tap on a pending-target card ──────────────────────────────
  // When link mode is active and the user simply taps another card
  // (no long press needed for the second tap), complete the link.
  function handleTouchTap(e: React.TouchEvent) {
    // Only act if a long press did NOT just fire (longPressActivated handles that path)
    if (longPressActivated.current) return
    const source = connectionSourceNodeId
    if (!source || source === id) return
    // Stop propagation so the canvas pane-click doesn't clear selection
    e.stopPropagation()
    createReferenceConnection(source, id)
    setConnectionSourceNode(null)
  }

  let extraShadow = ''
  if (isLinkSource) extraShadow = ', 0 0 0 3px rgba(99,102,241,0.85)'
  else if (isPendingTarget) extraShadow = ', 0 0 0 2px rgba(99,102,241,0.3)'

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
        cursor: isPendingTarget ? 'crosshair' : undefined,
      }}
      onClick={handleClick}
      onTouchStart={onTouchStart}
      onTouchEnd={handleTouchTap}
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

      {isLinkSource && (
        <div className="absolute -top-7 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-indigo-700/60 bg-indigo-950/90 px-2.5 py-1 text-[10px] font-semibold text-indigo-300 shadow-lg">
          Tap another card to link · tap here to cancel
        </div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  )
}
