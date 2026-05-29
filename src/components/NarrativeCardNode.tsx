import { useCallback, useEffect, useRef } from 'react'
import { Handle, Position, type NodeProps, useViewport } from 'reactflow'

import { getSlipColor, useNarrativeBoardStore } from '../store/useNarrativeBoardStore'
import { getPuzzleLabel, type CardData, type NarrativeNode, type SlipType, type Tag } from '../types/narrative'
import { computeTagLogos } from '../graph/tagLogos'
import { parseReferences } from '../graph/buildEdgesFromReferences'

const LONG_PRESS_MS = 400
const DRIFT_PX = 8

export function NarrativeCardNode({ id, data, selected }: NodeProps<CardData>) {
  void selected
  const slipTypes = useNarrativeBoardStore((state) => state.slipTypes)
  const tags = useNarrativeBoardStore((state) => state.tags)
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
  const nodes = useNarrativeBoardStore((state) => state.nodes)
  const linkMode = useNarrativeBoardStore((state) => state.linkMode)
  const setLinkMode = useNarrativeBoardStore((state) => state.setLinkMode)
  const matchingPickMode = useNarrativeBoardStore((state) => state.matchingPickMode)
  const matchingPickSourceNodeId = useNarrativeBoardStore((state) => state.matchingPickSourceNodeId)
  const matchingPickStagedIds = useNarrativeBoardStore((state) => state.matchingPickStagedIds)
  const confirmMatchingPick = useNarrativeBoardStore((state) => state.confirmMatchingPick)
  const minimizedMode = useNarrativeBoardStore((state) => state.minimizedMode)
  const activeGroup = activeGroupId ? groups.find((g) => g.id === activeGroupId) ?? null : null
  const isGroupSelected = !!activeGroup?.nodeIds.includes(id)

  const { zoom } = useViewport()
  // Ring spreads are in flow-space px; divide by zoom to keep a consistent
  // screen-pixel width regardless of zoom level.
  const r = (px: number) => `${px / zoom}px`

  const slipColor = getSlipColor(slipTypes, data.slipTypeId)
  const isLinkSource = connectionSourceNodeId === id
  const isSelected = selectedNodeIds.includes(id)
  const isHighlighted = highlightedNodeIds.includes(id)
  const isPendingTarget = !!connectionSourceNodeId && !isLinkSource
  const hasPuzzle = data.puzzleType !== 'none'

  const isPickSource = matchingPickMode && matchingPickSourceNodeId === id
  const isPickPicked = matchingPickMode && !isPickSource && matchingPickStagedIds.includes(id)
  const isPickTarget = matchingPickMode && !isPickSource && !isPickPicked
  const cardClassName = `card-shell relative overview ${minimizedMode ? 'minimized' : ''} ${isSelected ? 'card-selected' : ''} ${isHighlighted ? 'card-highlighted' : ''} ${hasPuzzle ? 'has-puzzle' : ''} ${isPickSource ? 'card-pick-source' : ''} ${isPickTarget ? 'card-pick-target' : ''} ${isPickPicked ? 'card-pick-picked' : ''}`

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
    if (matchingPickMode) {
      event.preventDefault()
      event.stopPropagation()
      confirmMatchingPick(id)
      return
    }

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
      if (connectionSourceNodeId || linkMode) {
        setLinkMode(false)
      }
      toggleNodeSelection(id)
      return
    }

    if (linkMode || connectionSourceNodeId) {
      if (!connectionSourceNodeId) {
        setConnectionSourceNode(id)
      } else if (connectionSourceNodeId !== id) {
        createReferenceConnection(connectionSourceNodeId, id)
        setConnectionSourceNode(null)
        setLinkMode(false)
      } else {
        setConnectionSourceNode(null)
        setLinkMode(false)
      }
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
  if (isLinkSource) extraShadow = `, 0 0 0 ${r(3)} rgba(99,102,241,0.85)`
  else if (isPendingTarget) extraShadow = `, 0 0 0 ${r(2)} rgba(99,102,241,0.3)`

  const baseShadow = isPickPicked
    ? `0 0 0 ${r(2)} rgba(255,255,255,0.85)`
    : isGroupSelected
      ? `0 0 0 ${r(3)} rgba(255,255,255,0.7)`
      : isSelected
        ? `0 0 0 ${r(2)} rgba(255,255,255,0.6)`
        : `0 0 0 ${r(2)} rgba(255,255,255,0.04)`

  const highlightShadow = isHighlighted
    ? isGroupSelected
      ? `, 0 0 0 ${r(12)} rgba(251,191,36,1), 0 0 0 ${r(18)} rgba(255,255,255,0.5)`
      : isSelected
        ? `, 0 0 0 ${r(12)} rgba(251,191,36,1), 0 0 0 ${r(17)} rgba(255,255,255,0.5)`
        : `, 0 0 0 ${r(12)} rgba(251,191,36,1), 0 0 0 ${r(14)} rgba(251,191,36,0.12)`
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

      {minimizedMode ? (
        <MinimizedContent
          data={data}
          slipTypes={slipTypes}
          tags={tags}
          nodes={nodes}
          slipColor={slipColor}
          hasPuzzle={hasPuzzle}
        />
      ) : (
        <OverviewContent
          data={data}
          slipTypes={slipTypes}
          tags={tags}
          nodes={nodes}
          slipColor={slipColor}
          hasPuzzle={hasPuzzle}
        />
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

type OverviewContentProps = {
  data: CardData
  slipTypes: SlipType[]
  tags: Tag[]
  nodes: NarrativeNode[]
  slipColor: string
  hasPuzzle: boolean
}

function OverviewContent({ data, slipTypes, tags, nodes, slipColor, hasPuzzle }: OverviewContentProps) {
  const given = data.slipGivenTypeIds ?? []
  const slipEntries = slipTypes
    .map((slip) => ({ slip, count: given.filter((id) => id === slip.id).length }))
    .filter(({ count }) => count > 0)

  const refCodes = data.referencesText ? parseReferences(data.referencesText) : []
  const refs = refCodes.map((code) => ({
    code,
    title: nodes.find((n) => n.data.code === code)?.data.title ?? null,
  }))

  const assignedTags = (data.tagIds ?? [])
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
  const tagLogos = assignedTags.length > 0 ? computeTagLogos(tags) : null
  const tagGlyphColor = `color-mix(in srgb, ${slipColor} 30%, #d4d4d8)`

  const summarySnippet = data.summary?.trim() || null
  const puzzleSnippet = hasPuzzle && data.puzzleSummary ? data.puzzleSummary.trim() : null

  return (
    <div className="card-overview">
      {assignedTags.length > 0 && tagLogos && (
        <div className="card-overview__tags">
          {assignedTags.map((tag) => (
            <span key={tag.id} className="card-overview__tag" title={tag.name} style={{ color: tagGlyphColor }}>
              {tagLogos.get(tag.id) ?? tag.name.charAt(0).toUpperCase()}
            </span>
          ))}
        </div>
      )}

      <div className="card-overview__heading">
        <span className="card-overview__code">{data.code}</span>
        <div className="card-overview__title">{data.title}</div>
      </div>

      {summarySnippet && (
        <div className="card-overview__summary">{summarySnippet}</div>
      )}

      {slipEntries.length > 0 && (
        <div className="card-overview__chips">
          <span className="card-overview__chip" title="Slips given">
            {slipEntries.map(({ slip, count }) => (
              <span key={slip.id} className="card-overview__slip" title={`${slip.name} ×${count}`}>
                <span className="card-overview__slip-dot" style={{ background: slip.color }} />
                {count > 1 && <span className="card-overview__chip-count">×{count}</span>}
              </span>
            ))}
          </span>
        </div>
      )}

      {refs.length > 0 && (
        <div className="card-overview__refs">
          {refs.map(({ code, title }) => (
            <div key={code} className="card-overview__ref-item" style={{ borderLeftColor: slipColor }}>
              <span className="card-overview__ref-code">{code}</span>
              {title}
            </div>
          ))}
        </div>
      )}

      {hasPuzzle && (
        <div className="card-overview__puzzle" style={{ background: `${slipColor}44` }}>
          <span className="card-overview__puzzle-label">{getPuzzleLabel(data.puzzleType)}</span>
          {puzzleSnippet && (
            <span className="card-overview__puzzle-summary">{puzzleSnippet}</span>
          )}
        </div>
      )}

    </div>
  )
}

/**
 * The minimized, distance-readable card body. Shows only the essentials:
 * title, slips given, reference titles (no codes), puzzle type (no summary),
 * and tag. No summary, no card code.
 */
function MinimizedContent({ data, slipTypes, tags, nodes, slipColor, hasPuzzle }: OverviewContentProps) {
  const given = data.slipGivenTypeIds ?? []
  const slipEntries = slipTypes
    .map((slip) => ({ slip, count: given.filter((id) => id === slip.id).length }))
    .filter(({ count }) => count > 0)

  const refTitles = (data.referencesText ? parseReferences(data.referencesText) : [])
    .map((code) => nodes.find((n) => n.data.code === code)?.data.title ?? code)

  const assignedTags = (data.tagIds ?? [])
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
  const tagLogos = assignedTags.length > 0 ? computeTagLogos(tags) : null
  const tagGlyphColor = `color-mix(in srgb, ${slipColor} 30%, #d4d4d8)`

  const hasBody = slipEntries.length > 0 || refTitles.length > 0 || hasPuzzle

  return (
    <div className="card-minimized">
      {/* Slip-color header band: the card's identity reads by color first, then title. */}
      <div className="card-minimized__band" style={{ background: slipColor }}>
        {assignedTags.length > 0 && tagLogos && (
          <div className="card-minimized__tags">
            {assignedTags.map((tag) => (
              <span key={tag.id} className="card-minimized__tag" title={tag.name} style={{ color: tagGlyphColor }}>
                {tagLogos.get(tag.id) ?? tag.name.charAt(0).toUpperCase()}
              </span>
            ))}
          </div>
        )}
        <div className="card-minimized__title">{data.title}</div>
      </div>

      {hasBody && (
        <div className="card-minimized__body">
          {slipEntries.length > 0 && (
            <div className="card-minimized__slips" title="Slips given">
              {slipEntries.map(({ slip, count }) => (
                <span key={slip.id} className="card-minimized__slip" title={`${slip.name} ×${count}`}>
                  <span className="card-minimized__slip-dot" style={{ background: slip.color }} />
                  {count > 1 && <span className="card-minimized__slip-count">×{count}</span>}
                </span>
              ))}
            </div>
          )}

          {refTitles.map((title, i) => (
            <div key={i} className="card-minimized__ref" style={{ borderLeftColor: slipColor }}>
              {title}
            </div>
          ))}

          {hasPuzzle && (
            <div className="card-minimized__puzzle" style={{ background: slipColor }}>
              <span className="card-minimized__puzzle-type">{getPuzzleLabel(data.puzzleType)}:</span>
              {data.puzzleTitle?.trim() && (
                <span className="card-minimized__puzzle-title">{data.puzzleTitle.trim()}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
