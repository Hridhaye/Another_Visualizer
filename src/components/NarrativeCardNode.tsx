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
  const selectedNodeIds = useNarrativeBoardStore((state) => state.selectedNodeIds)
  const groups = useNarrativeBoardStore((state) => state.groups)
  const connectionSourceNodeId = useNarrativeBoardStore((state) => state.connectionSourceNodeId)
  const contextPanelOpen = useNarrativeBoardStore((state) => state.contextPanelOpen)
  const openContextPanel = useNarrativeBoardStore((state) => state.openContextPanel)
  const closeContextPanel = useNarrativeBoardStore((state) => state.closeContextPanel)
  const updateNode = useNarrativeBoardStore((state) => state.updateNode)
  const deleteCard = useNarrativeBoardStore((state) => state.deleteCard)
  const setConnectionSourceNode = useNarrativeBoardStore((state) => state.setConnectionSourceNode)
  const createReferenceConnection = useNarrativeBoardStore((state) => state.createReferenceConnection)
  const setSelectedNode = useNarrativeBoardStore((state) => state.setSelectedNode)
  const toggleNodeSelection = useNarrativeBoardStore((state) => state.toggleNodeSelection)
  const nodes = useNarrativeBoardStore((state) => state.nodes)
  const thisNode = nodes.find((node) => node.id === id)

  const highlightedNodeIds = useNarrativeBoardStore((state) => state.highlightedNodeIds)
  const activeGroupId = useNarrativeBoardStore((state) => state.activeGroupId)
  const activeGroup = activeGroupId ? groups.find((g) => g.id === activeGroupId) ?? null : null
  const isGroupSelected = !!activeGroup?.nodeIds.includes(id)

  const slipColor = getSlipColor(slipTypes, data.slipTypeId)
  const isLinkSource = connectionSourceNodeId === id
  const isSelected = selectedNodeIds.includes(id)
  const isHighlighted = highlightedNodeIds.includes(id)
  const isPendingTarget = !!connectionSourceNodeId && !isLinkSource
  const showContextPanel =
    selectedNodeId === id && selectedNodeIds.length === 1 && contextPanelOpen && !!thisNode
  const nodeGroups = groups.filter((group) => group.nodeIds.includes(id))

  const divRef = useRef<HTMLDivElement | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartPos = useRef<{ x: number; y: number } | null>(null)
  const longPressActivated = useRef(false)

  const connectionSourceRef = useRef(connectionSourceNodeId)
  const setConnectionRef = useRef(setConnectionSourceNode)
  const createRefConnection = useRef(createReferenceConnection)

  useEffect(() => {
    connectionSourceRef.current = connectionSourceNodeId
  }, [connectionSourceNodeId])

  useEffect(() => {
    setConnectionRef.current = setConnectionSourceNode
  }, [setConnectionSourceNode])

  useEffect(() => {
    createRefConnection.current = createReferenceConnection
  }, [createReferenceConnection])

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleTouchMove = useCallback((event: TouchEvent) => {
    const touch = event.touches[0]
    if (!touch || !touchStartPos.current) {
      return
    }

    if (!longPressActivated.current) {
      const dx = touch.clientX - touchStartPos.current.x
      const dy = touch.clientY - touchStartPos.current.y
      if (Math.sqrt(dx * dx + dy * dy) > DRIFT_PX) {
        cancelLongPress()
        touchStartPos.current = null
      }
      return
    }

    event.preventDefault()
    event.stopPropagation()
  }, [])

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    cancelLongPress()
    touchStartPos.current = null

    if (!longPressActivated.current) {
      return
    }
    longPressActivated.current = false

    event.preventDefault()
    event.stopPropagation()

    const source = connectionSourceRef.current
    if (!source) {
      return
    }

    if (source !== id) {
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
    const element = divRef.current
    if (!element) {
      return
    }

    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: false })
    element.addEventListener('touchcancel', handleTouchCancel)

    return () => {
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [handleTouchMove, handleTouchEnd, handleTouchCancel])

  function onTouchStart(event: React.TouchEvent) {
    const touch = event.touches[0]
    if (!touch) {
      return
    }

    touchStartPos.current = { x: touch.clientX, y: touch.clientY }
    longPressActivated.current = false

    longPressTimer.current = setTimeout(() => {
      longPressActivated.current = true
      setConnectionRef.current(id)
    }, LONG_PRESS_MS)
  }

  function handleClick(event: React.MouseEvent) {
    if (event.altKey) {
      event.preventDefault()
      event.stopPropagation()

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

    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()
      event.stopPropagation()
      if (connectionSourceNodeId) {
        setConnectionSourceNode(null)
      }
      toggleNodeSelection(id)
      return
    }

    if (connectionSourceNodeId) {
      setConnectionSourceNode(null)
      return
    }

    setSelectedNode(id)
    openContextPanel()
  }

  function handleTouchTap(event: React.TouchEvent) {
    if (longPressActivated.current) {
      return
    }

    const source = connectionSourceNodeId
    if (!source) {
      setSelectedNode(id)
      openContextPanel()
      return
    }

    if (source === id) {
      return
    }

    event.stopPropagation()
    createReferenceConnection(source, id)
    setConnectionSourceNode(null)
  }

  let extraShadow = ''
  if (isLinkSource) extraShadow = ', 0 0 0 3px rgba(99,102,241,0.85)'
  else if (isPendingTarget) extraShadow = ', 0 0 0 2px rgba(99,102,241,0.3)'

  const baseShadow = isGroupSelected
    ? `0 0 0 3px rgba(255,255,255,0.7)`
    : isSelected
      ? `0 0 0 2px rgba(255,255,255,0.6)`
      : `0 0 0 2px rgba(255,255,255,0.04)`

  const highlightShadow = isHighlighted
    ? isGroupSelected
      ? ', 0 0 0 12px rgba(251,191,36,1), 0 0 0 18px rgba(255,255,255,0.5)'
      : isSelected
        ? ', 0 0 0 12px rgba(251,191,36,1), 0 0 0 17px rgba(255,255,255,0.5)'
        : ', 0 0 0 12px rgba(251,191,36,1), 0 0 0 14px rgba(251,191,36,0.12)'
    : ''

  return (
    <div
      ref={divRef}
      data-card-id={id}
      className={`card-shell relative ${isSelected ? 'card-selected' : ''} ${isHighlighted ? 'card-highlighted' : ''}`}
      style={{
        border: `7px solid ${slipColor}`,
        backgroundColor: '#18181b',
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.03), rgba(255,255,255,0)), linear-gradient(to bottom, ${slipColor}1f, ${slipColor}12)`,
        boxShadow: `${baseShadow}${extraShadow}${highlightShadow}`,
        transform: isHighlighted ? 'scale(1.06)' : undefined,
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

      {nodeGroups.length > 0 && (
        <div className="card-groups">
          {nodeGroups.map((group) => (
            <span key={group.id} className="card-group-badge">
              {group.name}
            </span>
          ))}
        </div>
      )}

      {data.referencesText && (
        <div className="mt-4 border-t border-zinc-700 pt-3 text-sm text-zinc-400">
          References: {data.referencesText}
        </div>
      )}

      {isLinkSource && (
        <div className="absolute -top-7 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-indigo-700/60 bg-indigo-950/90 px-2.5 py-1 text-[10px] font-semibold text-indigo-300 shadow-lg">
          Tap another card to link - tap here to cancel
        </div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  )
}
