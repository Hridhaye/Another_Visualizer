import { memo, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { Handle, Position, useStore, type NodeProps } from 'reactflow'

import { getSlipColor, HIGHLIGHT_SCALE, useNarrativeBoardStore } from '../store/useNarrativeBoardStore'
import { getPuzzleLabel, type CardData, type SlipType, type Tag } from '../types/narrative'
import { computeTagLogos } from '../graph/tagLogos'
import { parseReferences } from '../graph/buildEdgesFromReferences'
import { CardCodeIndexContext } from './cardRefsContext'

type ResolvedRef = { code: string; title: string | null; slipColor: string }

// Below this zoom, card detail is unreadable anyway, so we render a cheap flat
// "far" card (color block + title) — no box-shadow, gradients, or text-shadows.
// This keeps panning fast when many cards are on screen (you only get many
// on screen by zooming out). Cards subscribe to the boolean `zoom < threshold`,
// not zoom itself, so they only re-render when crossing the threshold — never
// per pan frame.
const FAR_ZOOM_THRESHOLD = 0.2

// Tag logos depend only on the (rarely-changing) tags array. Memoize by array
// identity so every card render doesn't recompute the O(tags²) prefix logic.
let cachedTags: Tag[] | null = null
let cachedTagLogos: Map<string, string> = new Map()
function getTagLogos(tags: Tag[]): Map<string, string> {
  if (tags !== cachedTags) {
    cachedTags = tags
    cachedTagLogos = computeTagLogos(tags)
  }
  return cachedTagLogos
}

const LONG_PRESS_MS = 400
const DRIFT_PX = 8

/** Returns a text color (white or near-black) that contrasts well against the given hex slip color. */
function getContrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // Relative luminance per WCAG 2.x
  const toLinear = (c: number) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
  return L > 0.35 ? '#3a3a3a' : '#f5f5f5'
}

function NarrativeCardNodeImpl({ id, data, selected }: NodeProps<CardData>) {
  // Action handles are stable references in zustand, so subscribing to them
  // never triggers a re-render.
  const openContextPanel = useNarrativeBoardStore((state) => state.openContextPanel)
  const setConnectionSourceNode = useNarrativeBoardStore((state) => state.setConnectionSourceNode)
  const createReferenceConnection = useNarrativeBoardStore((state) => state.createReferenceConnection)
  const setSelectedNode = useNarrativeBoardStore((state) => state.setSelectedNode)
  const toggleNodeSelection = useNarrativeBoardStore((state) => state.toggleNodeSelection)
  const setLinkMode = useNarrativeBoardStore((state) => state.setLinkMode)
  const confirmMatchingPick = useNarrativeBoardStore((state) => state.confirmMatchingPick)

  // Shared, rarely-changing slices. Each is a primitive/stable reference, so a
  // change to one re-renders cards once, not per board interaction.
  const tags = useNarrativeBoardStore((state) => state.tags)
  const slipTypes = useNarrativeBoardStore((state) => state.slipTypes)
  const minimizedMode = useNarrativeBoardStore((state) => state.minimizedMode)
  // True when zoomed far enough out that detail isn't readable. Subscribing to
  // the boolean (not the zoom scalar) means a re-render only on threshold
  // crossing, not every pan frame.
  const isFar = useStore((state) => state.transform[2] < FAR_ZOOM_THRESHOLD)
  const connectionSourceNodeId = useNarrativeBoardStore((state) => state.connectionSourceNodeId)
  const linkMode = useNarrativeBoardStore((state) => state.linkMode)
  const matchingPickMode = useNarrativeBoardStore((state) => state.matchingPickMode)
  const matchingPickSourceNodeId = useNarrativeBoardStore((state) => state.matchingPickSourceNodeId)

  // Selection ring comes from ReactFlow's per-node `selected` prop (mirrored
  // from the store in App). The card no longer subscribes to selectedNodeIds,
  // so selecting one card does not notify every other card.
  const isSelected = selected ?? false

  // Per-card boolean flags as primitive selectors: each re-renders only THIS
  // card when its own value flips, never scanning the nodes array.
  const isHighlighted = useNarrativeBoardStore((state) => state.highlightedNodeIds.includes(id))
  const anyHighlighted = useNarrativeBoardStore((state) => state.highlightedNodeIds.length > 0)
  const isGroupSelected = useNarrativeBoardStore((state) => {
    if (!state.activeGroupId) return false
    const group = state.groups.find((g) => g.id === state.activeGroupId)
    return group ? group.nodeIds.includes(id) : false
  })
  const isPickPicked = useNarrativeBoardStore(
    (state) => state.matchingPickMode && state.matchingPickSourceNodeId !== id && state.matchingPickStagedIds.includes(id)
  )

  // Resolve this card's references via the shared code index (O(1) per code).
  // The index identity only changes when card content/palette changes, so this
  // memo doesn't recompute on drag/pan/select.
  const codeIndex = useContext(CardCodeIndexContext)
  const refs = useMemo<ResolvedRef[]>(() => {
    if (!data.referencesText) return []
    return parseReferences(data.referencesText).map((code) => {
      const entry = codeIndex.get(code)
      return { code, title: entry?.title ?? null, slipColor: entry?.slipColor ?? getSlipColor(slipTypes, '') }
    })
  }, [data.referencesText, codeIndex, slipTypes])

  // Ring spreads are fixed flow-space px — like the card's 7px border, they
  // scale with zoom.
  const r = (px: number) => `${px}px`

  const slipColor = getSlipColor(slipTypes, data.slipTypeId)
  const isLinkSource = connectionSourceNodeId === id
  const isDimmed = anyHighlighted && !isHighlighted
  const isPendingTarget = !!connectionSourceNodeId && !isLinkSource
  const hasPuzzle = data.puzzleType !== 'none'

  const isPickSource = matchingPickMode && matchingPickSourceNodeId === id
  const isPickTarget = matchingPickMode && !isPickSource && !isPickPicked
  const cardClassName = `card-shell relative overview ${minimizedMode ? 'minimized' : ''} ${isSelected ? 'card-selected' : ''} ${isHighlighted ? 'card-highlighted' : ''} ${isDimmed ? 'card-dimmed' : ''} ${hasPuzzle ? 'has-puzzle' : ''} ${isPickSource ? 'card-pick-source' : ''} ${isPickTarget ? 'card-pick-target' : ''} ${isPickPicked ? 'card-pick-picked' : ''}`

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

  // A single small glow marks a highlighted card. (Was a layered 20px+6px blur;
  // a 30px-blur box-shadow is one of the costlier things to composite per card.)
  const highlightGlow = isHighlighted
    ? `, 0 0 ${r(8)} ${r(2)} rgba(255,255,255,0.18)`
    : ''

  // Far (zoomed-out) view: a flat slip-colored block with just the title. No
  // box-shadow, gradients, or nested detail — cheap to paint when dozens are on
  // screen. A thin solid ring still marks selection/highlight so the big-picture
  // view stays legible.
  if (isFar) {
    const farRing = isSelected || isGroupSelected
      ? 'inset 0 0 0 6px rgba(255,255,255,0.85)'
      : isHighlighted
        ? 'inset 0 0 0 6px rgba(255,255,255,0.6)'
        : undefined
    return (
      <div
        ref={divRef}
        data-card-id={id}
        className="card-shell card-far"
        style={{
          background: slipColor,
          boxShadow: farRing,
          opacity: isDimmed ? 0.4 : undefined,
          cursor: isPendingTarget ? 'crosshair' : undefined,
        }}
        onClick={handleClick}
        onTouchStart={onTouchStart}
        onTouchEnd={handleTouchTap}
      >
        <Handle type="target" position={Position.Left} />
        <div className="card-far__title" style={{ color: getContrastText(slipColor) }}>
          {data.title}
        </div>
        <Handle type="source" position={Position.Right} />
      </div>
    )
  }

  return (
    <div
      ref={divRef}
      data-card-id={id}
      className={cardClassName}
      style={{
        // Flat solid background — the former dual ~5%-alpha gradients were nearly
        // invisible but repainted every frame. Flat fills composite far cheaper.
        border: `7px solid ${slipColor}`,
        backgroundColor: '#14151c',
        boxShadow: `${baseShadow}${extraShadow}${highlightGlow}`,
        transform: isHighlighted ? `scale(${HIGHLIGHT_SCALE})` : undefined,
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
          refs={refs}
          slipColor={slipColor}
          hasPuzzle={hasPuzzle}
        />
      ) : (
        <OverviewContent
          data={data}
          slipTypes={slipTypes}
          tags={tags}
          refs={refs}
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

/** Memoized so a card re-renders only when its own props (data, selection,
 *  resolved refs, etc.) change — not when an unrelated card moves or the shared
 *  node/edge arrays get a new identity. */
export const NarrativeCardNode = memo(NarrativeCardNodeImpl)

type OverviewContentProps = {
  data: CardData
  slipTypes: SlipType[]
  tags: Tag[]
  refs: ResolvedRef[]
  slipColor: string
  hasPuzzle: boolean
}

function OverviewContent({ data, slipTypes, tags, refs, slipColor, hasPuzzle }: OverviewContentProps) {
  const given = data.slipGivenTypeIds ?? []
  const slipEntries = slipTypes
    .map((slip) => ({ slip, count: given.filter((id) => id === slip.id).length }))
    .filter(({ count }) => count > 0)

  const assignedTags = (data.tagIds ?? [])
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
  const tagLogos = assignedTags.length > 0 ? getTagLogos(tags) : null
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
        <div className="card-overview__title">{data.title}</div>
      </div>

      {summarySnippet && (
        <div className="card-overview__summary">{summarySnippet}</div>
      )}

      {slipEntries.length > 0 && (
        <div className="card-overview__chips" title="Slips given">
          {slipEntries.map(({ slip, count }) => (
            <span key={slip.id} className="card-overview__slip" title={`${slip.name} ×${count}`}>
              <span className="card-overview__slip-dot" style={{ background: slip.color }} />
              {count > 1 && <span className="card-overview__chip-count">×{count}</span>}
            </span>
          ))}
        </div>
      )}

      {refs.length > 0 && (
        <div className="card-overview__refs">
          {refs.map(({ code, title, slipColor: refSlipColor }) => (
            <div key={code} className="card-overview__ref-item" style={{ borderLeftColor: refSlipColor }}>
              <span className="card-overview__ref-code">{code}</span>
              {title}
            </div>
          ))}
        </div>
      )}

      {hasPuzzle && (
        <div className="card-overview__puzzle">
          <span className="card-overview__puzzle-label" style={{ color: slipColor }}>
            {getPuzzleLabel(data.puzzleType)}
          </span>
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
function MinimizedContent({ data, slipTypes, tags, refs, slipColor, hasPuzzle }: OverviewContentProps) {
  const given = data.slipGivenTypeIds ?? []
  const slipEntries = slipTypes
    .map((slip) => ({ slip, count: given.filter((id) => id === slip.id).length }))
    .filter(({ count }) => count > 0)

  const refItems = refs.map(({ code, title, slipColor: refSlipColor }) => ({
    title: title ?? code,
    slipColor: refSlipColor,
  }))

  const assignedTags = (data.tagIds ?? [])
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
  const tagLogos = assignedTags.length > 0 ? getTagLogos(tags) : null
  const contrastText = getContrastText(slipColor)
  const hasBody = slipEntries.length > 0 || refItems.length > 0 || hasPuzzle

  return (
    <div className="card-minimized">
      <div className="card-minimized__band" style={{ background: slipColor }}>
        {assignedTags.length > 0 && tagLogos && (
          <div className="card-minimized__tags">
            {assignedTags.map((tag) => (
              <span key={tag.id} className="card-minimized__tag" title={tag.name} style={{ color: contrastText }}>
                {tagLogos.get(tag.id) ?? tag.name.charAt(0).toUpperCase()}
              </span>
            ))}
          </div>
        )}
        <div className="card-minimized__title" style={{ color: contrastText }}>{data.title}</div>
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

          {refItems.map(({ title, slipColor: refSlipColor }, i) => (
            <div key={i} className="card-minimized__ref" style={{ borderLeftColor: refSlipColor }}>
              {title}
            </div>
          ))}

          {hasPuzzle && (
            <div className="card-minimized__puzzle" style={{ background: slipColor, color: contrastText }}>
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
