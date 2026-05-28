import { useCallback, useEffect, useRef } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'

import { getSlipColor, useNarrativeBoardStore } from '../store/useNarrativeBoardStore'
import { getPuzzleDisplayText, type CardData } from '../types/narrative'

const LONG_PRESS_MS = 400
const DRIFT_PX = 8

export function NarrativeCardNode({ id, data, selected }: NodeProps<CardData>) {
  void selected
  const slipTypes = useNarrativeBoardStore((state) => state.slipTypes)
  const selectedNodeIds = useNarrativeBoardStore((state) => state.selectedNodeIds)
  const groups = useNarrativeBoardStore((state) => state.groups)
  const connectionSourceNodeId = useNarrativeBoardStore((state) => state.connectionSourceNodeId)
  const openContextPanel = useNarrativeBoardStore((state) => state.openContextPanel)
  const setConnectionSourceNode = useNarrativeBoardStore((state) => state.setConnectionSourceNode)
  const createReferenceConnection = useNarrativeBoardStore((state) => state.createReferenceConnection)
  const setSelectedNode = useNarrativeBoardStore((state) => state.setSelectedNode)
  const toggleNodeSelection = useNarrativeBoardStore((state) => state.toggleNodeSelection)
  const highlightedNodeIds = useNarrativeBoardStore((state) => state.highlightedNodeIds)
  const activeGroupId = useNarrativeBoardStore((state) => state.activeGroupId)
  const activeGroup = activeGroupId ? groups.find((g) => g.id === activeGroupId) ?? null : null
  const isGroupSelected = !!activeGroup?.nodeIds.includes(id)

  const slipColor = getSlipColor(slipTypes, data.slipTypeId)
  const isLinkSource = connectionSourceNodeId === id
  const isSelected = selectedNodeIds.includes(id)
  const isHighlighted = highlightedNodeIds.includes(id)
  const isPendingTarget = !!connectionSourceNodeId && !isLinkSource
  const nodeGroups = groups.filter((group) => group.nodeIds.includes(id))
  const hasPuzzle = data.puzzleType !== 'none'
  const puzzleText = getPuzzleDisplayText(data.puzzleType, data.puzzleSummary)
  const cardClassName = `card-shell relative ${isSelected ? 'card-selected' : ''} ${isHighlighted ? 'card-highlighted' : ''} ${hasPuzzle ? 'has-puzzle' : ''}`

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
      className={cardClassName}
      style={{
        border: `7px solid ${slipColor}`,
        backgroundColor: '#0f1015',
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.02), rgba(255,255,255,0)), linear-gradient(to bottom, ${slipColor}0d, ${slipColor}08)`,
        boxShadow: `${baseShadow}${extraShadow}${highlightShadow}`,
        transform: isHighlighted ? 'scale(1.06)' : undefined,
        cursor: isPendingTarget ? 'crosshair' : undefined,
      }}
      onClick={handleClick}
      onTouchStart={onTouchStart}
      onTouchEnd={handleTouchTap}
    >
      <Handle type="target" position={Position.Left} />

      <div className="card-header">
        <div className="card-code">{data.code}</div>
        <div className="card-title">{data.title}</div>
      </div>

      <div className="card-summary">{data.summary}</div>

      {(data.slipGivenTypeIds ?? []).length > 0 && (() => {
        const given = data.slipGivenTypeIds ?? []
        const entries = slipTypes
          .map((slip) => ({ slip, count: given.filter((id) => id === slip.id).length }))
          .filter(({ count }) => count > 0)
        return (
          <div className="card-slip-given">
            <span className="card-slip-given__label">Slip Given</span>
            <div className="card-slip-given__dots">
              {entries.map(({ slip, count }) => (
                <span key={slip.id} className="card-slip-given__entry" title={`${slip.name} ×${count}`}>
                  <span className="card-slip-given__dot" style={{ background: slip.color }} />
                  {count > 1 && <span className="card-slip-given__count">×{count}</span>}
                </span>
              ))}
            </div>
          </div>
        )
      })()}

      {nodeGroups.length > 0 && (
        <div className="card-groups">
          {nodeGroups.map((group) => (
            <span key={group.id} className="card-group-badge">
              {group.name}
            </span>
          ))}
        </div>
      )}

      {(data.referencesText || hasPuzzle) && (
        <div className="mt-6 border-t border-zinc-700 pt-5">
          {data.referencesText && (
            <div className={`text-sm text-zinc-400 ${hasPuzzle ? 'mb-6' : ''}`}>
              <span className="text-zinc-500 uppercase text-[10px] font-bold" style={{ letterSpacing: '0.05em' }}>
                References:
              </span>{' '}
              {data.referencesText}
            </div>
          )}
          {hasPuzzle && (
            <div className="card-puzzle" title={puzzleText}>
              <span 
                className="card-puzzle__badge"
                style={{
                  background: `${slipColor}15`,
                  fontWeight: 700,
                  border: `1px solid ${slipColor}40`,
                  borderLeft: `4px solid ${slipColor}`,
                  color: slipColor,
                }}
              >
                {puzzleText}
              </span>
            </div>
          )}
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
