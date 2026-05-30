# Another Visualizer — Technical Implementation Reference

A node-based narrative plotting and puzzle design tool. Engineers can use this document to understand every layer of the system before refactoring or extending it.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Directory Structure](#2-directory-structure)
3. [Core Data Types](#3-core-data-types)
4. [State Management](#4-state-management)
5. [Main App & Canvas](#5-main-app--canvas)
6. [Card Node Component](#6-card-node-component)
7. [Edge Routing Pipeline](#7-edge-routing-pipeline)
8. [AI / DSL Format](#8-ai--dsl-format)
9. [Persistence & Cloud Storage](#9-persistence--cloud-storage)
10. [Firebase Integration](#10-firebase-integration)
11. [Sidebar & Panels](#11-sidebar--panels)
12. [Graph Utilities](#12-graph-utilities)
13. [Styling Architecture](#13-styling-architecture)
14. [Testing](#14-testing)
15. [Key Constraints & Limitations](#15-key-constraints--limitations)

---

## 1. Tech Stack

| Layer | Library | Version |
|---|---|---|
| UI Framework | React | 19.2.6 |
| Language | TypeScript | 6.0.2 |
| Build | Vite | 8.0.12 |
| Graph canvas | ReactFlow | 11.11.4 |
| State | Zustand | 5.0.13 |
| Graph layout (A*) | ELKjs | 0.11.1 (imported but A* is hand-rolled) |
| Auth | Firebase | 12.14.0 |
| Database | Firebase Firestore | (same package) |
| Testing | Vitest | — |

No Redux, no React Context for global state — Zustand only. No routing library (single-page, no URL routes).

---

## 2. Directory Structure

```
src/
├── App.tsx                          # Root component, canvas, toolbar
├── main.tsx                         # React 19 entry point
├── App.css                          # Board layout, toolbar, history bar
├── styles/
│   ├── card.css                     # Card shells, puzzle panels (1897 lines)
│   ├── sidebar.css                  # Sidebar layout
│   ├── utilities.css                # Shared utility classes
│   └── index.css
├── types/
│   └── narrative.ts                 # All TypeScript types (single source of truth)
├── store/
│   └── useNarrativeBoardStore.ts    # Zustand store — 1562 lines, 100+ actions
├── components/
│   ├── NarrativeCardNode.tsx        # Rendered card (ReactFlow custom node)
│   ├── ContextPanel.tsx             # Floating quick-edit panel
│   ├── NarrativeBodyPanel.tsx       # Full-screen rich-text editor
│   ├── PuzzleFillPanel.tsx          # Fill-in-the-blank puzzle editor
│   ├── PuzzleReorderPanel.tsx       # Drag-to-reorder puzzle editor
│   ├── PuzzleMatchingPanel.tsx      # Matching puzzle editor
│   ├── CardEditorFlyout.tsx         # Side editor for card fields
│   ├── PanelDSLControls.tsx         # AI format import/export controls
│   ├── MinimapControls.tsx
│   ├── Sidebar/
│   │   ├── Sidebar.tsx
│   │   ├── BoardControls.tsx        # Project save/load/cloud, AI import
│   │   ├── SlipManager.tsx          # Slip type CRUD + color picker
│   │   └── CardEditor.tsx
│   └── edges/
│       ├── MovableEdge.tsx          # Directed edge renderer
│       ├── BiDirectionalEdge.tsx    # Bidirectional edge renderer
│       ├── useTidyLines.ts          # On-demand A* routing hook
│       ├── useObstacleRoute.ts      # Floating elbow + A* fallback
│       ├── bundleEdges.ts           # Trunk-bundled polyline routing
│       ├── routeOrthogonal.ts       # A* pathfinding implementation
│       ├── floatingEdge.ts          # Dynamic elbow + obstacle detection
│       └── edgeColors.ts            # Slip-color derivation for edges
├── graph/
│   ├── buildEdgesFromReferences.ts  # referencesText → NarrativeEdge[]
│   ├── generateNextCode.ts          # Auto-increment card codes (AA01 → AA02)
│   └── tagLogos.ts                  # Minimal non-colliding tag glyphs
├── ai/
│   ├── panelDSL.ts                  # Serialize/parse narrative body + puzzles
│   ├── importAIFormat.ts            # Parse full @CARD DSL import
│   ├── exportAIFormat.ts            # Export full @CARD DSL
│   ├── parseAIBlocks.ts             # Split raw text into @CARD blocks
│   ├── validateAIFormat.ts          # Validate DSL structure
│   └── aiFormat.test.ts             # 13 Vitest tests for round-trip DSL
├── persistence/
│   ├── serializeProject.ts          # Board state → SerializedProject JSON
│   ├── deserializeProject.ts        # JSON → board state with validation
│   └── validateProject.ts           # Schema validation
└── firebase/
    ├── config.ts                    # Firebase app + Firestore init
    ├── auth.ts                      # Google Auth, onAuthStateChanged
    └── cloudStorage.ts              # Firestore setDoc / getDoc
```

---

## 3. Core Data Types

**File:** [src/types/narrative.ts](src/types/narrative.ts)

Everything flows through these types. Edges are derived from nodes — they are never persisted independently.

### CardData

```typescript
export type CardData = {
  code: string                        // Auto-generated: AA01, BB02, …
  title: string
  summary: string
  body: string                        // Stored as HTML
  slipTypeId: string                  // References SlipType.id
  slipGivenTypeIds: string[]          // Multiset: repeated ids for counts
  referencesText: string              // Comma-separated codes: "AA02, CV14"
  referenceSlipForms?: string[]       // Codes with slip-form toggle ON
  tagIds?: string[]                   // References Tag.id entries
  puzzleType: 'none' | 'fill' | 'reorder' | 'matching'
  puzzleTitle?: string
  puzzleSummary?: string
  puzzleFillContent?: FillPuzzleContent
  puzzleReorderContent?: ReorderPuzzleContent
  puzzleMatchingContent?: MatchingPuzzleContent
}
```

### Slip Types, Tags, Groups

```typescript
export type SlipType = { id: string; name: string; color: string }
export type Tag      = { id: string; name: string }
export type CardGroup = { id: string; name: string; nodeIds: string[] }
```

### ReactFlow node/edge aliases

```typescript
export type NarrativeNode = Node<CardData>   // ReactFlow Node generic
export type NarrativeEdge = Edge             // ReactFlow Edge
```

### Puzzle content types

**Fill (fill-in-the-blank):**
```typescript
export type FillPuzzleContent = {
  bodyHtml: string         // HTML with <span data-blank-id="…"> placeholders
  blanks: FillBlank[]      // { id, assignedWord: string | null }
  wordBank: FillWordBankEntry[]  // { id, word }
  showAnswers: boolean
}
```

**Reorder:**
```typescript
export type ReorderPuzzleContent = {
  boxes: ReorderBox[]          // { id, text }
  scrambledOrder: string[]     // box ids in the order shown to the player
  solutionOrder: string[]      // box ids in the correct order
}
```

**Matching:**
```typescript
export type MatchingCard = {
  nodeId: string            // References NarrativeNode.id
  isSolution: boolean
  representativeLine: string
}
export type MatchingPuzzleContent = {
  questionHtml: string
  cards: MatchingCard[]
}
```

### Serialized project (JSON export format)

```typescript
export type SerializedProject = {
  version: 1
  metadata: { projectName: string; createdAt: string; updatedAt: string }
  viewport: { x: number; y: number; zoom: number }
  slipTypes: SlipType[]
  tags: Tag[]
  groups: CardGroup[]
  nodes: NarrativeNode[]
  [key: string]: unknown    // edgeShapes dormant field
}
```

---

## 4. State Management

**File:** [src/store/useNarrativeBoardStore.ts](src/store/useNarrativeBoardStore.ts)

Single Zustand store, 1562 lines. All components subscribe to slices via selector functions — no prop drilling for global state.

### State shape

```typescript
type NarrativeBoardState = {
  nodes: NarrativeNode[]
  edges: NarrativeEdge[]
  edgeShapes: Record<string, number>          // Dormant: per-edge segment offsets
  routedPaths: Record<string, Point[]>        // A*-routed polylines, keyed by edge id
  edgeColors: Record<string, string>          // Slip color per edge id
  bundleEdges: boolean                        // Trunk-bundled routing (default on)
  selectedNodeId: string | null              // Primary selected card
  selectedNodeIds: string[]                   // Full multi-select set
  groups: CardGroup[]
  slipTypes: SlipType[]
  tags: Tag[]
  sidebarCollapsed: boolean
  sectionsOpen: SectionOpenState             // boardControls | slipManager | cardEditor
  connectionSourceNodeId: string | null      // Link mode: first-clicked card
  linkMode: boolean
  minimizedMode: boolean                     // Compact card view
  minimapVisible: boolean
  minimapCollapsed: boolean
  metadata: SerializedMetadata
  viewport: SerializedViewport
  hasUnsavedChanges: boolean
  contextPanelOpen: boolean
  narrativeBodyOpen: boolean
  puzzleBodyOpen: boolean
  activeEditorField: EditorField
  canUndo: boolean
  canRedo: boolean
  historyPast: HistorySnapshot[]
  historyFuture: HistorySnapshot[]
  multiSelectMode: boolean
  highlightedNodeIds: string[]
  activeHighlightFilters: HighlightFilter[]
  activeGroupId: string | null
  matchingPickMode: boolean
  matchingPickSourceNodeId: string | null
  matchingPickStagedIds: string[]
  currentUser: User | null                   // Firebase Auth user
  authLoading: boolean
  cloudSaveLoading: boolean
  cloudLoadLoading: boolean
  lastCloudSyncAt: Date | null
}
```

### History (undo/redo)

A snapshot is taken before every mutating action and pushed to `historyPast`. `undo()` pops from past, pushes current state to `historyFuture`. The snapshot is a shallow-spread deep enough to prevent reference aliasing:

```typescript
function createSnapshot(state: NarrativeBoardState): HistorySnapshot {
  return {
    nodes: state.nodes.map((node) => ({
      ...node, data: { ...node.data }, position: { ...node.position }
    })),
    edges: state.edges.map((edge) => ({ ...edge })),
    edgeShapes: { ...state.edgeShapes },
    selectedNodeId: state.selectedNodeId,
    selectedNodeIds: [...state.selectedNodeIds],
    groups: state.groups.map((group) => ({ ...group, nodeIds: [...group.nodeIds] })),
    slipTypes: state.slipTypes.map((slip) => ({ ...slip })),
    tags: state.tags.map((tag) => ({ ...tag })),
    metadata: { ...state.metadata },
    viewport: { ...state.viewport },
    hasUnsavedChanges: state.hasUnsavedChanges
  }
}
```

Undo/redo are wired to **Ctrl+Z / Ctrl+Shift+Z** in `App.tsx`'s `keydown` listener.

### Edge regeneration

Edges are never stored directly — they are always derived from `referencesText` on every node mutation:

```typescript
function buildEdges(nodes: NarrativeNode[], edgeShapes: EdgeShapeMap): NarrativeEdge[] {
  return buildEdgesFromReferences(nodes).map((edge) => {
    const offset = edgeShapes[edge.id]
    return typeof offset === 'number'
      ? { ...edge, data: { ...edge.data, manualOffset: offset } }
      : edge
  })
}
```

This runs inside `updateNode`, `deleteCard`, `addCard`, `onConnect`, and any action that mutates node data.

### Highlight scale constant

```typescript
export const HIGHLIGHT_SCALE = 1.15
```

Exported so edge routing can inflate card rects by the same factor — a CSS `transform: scale()` does not change the layout box that ReactFlow measures, so A*-routed paths would otherwise anchor under the grown card.

### Key action signatures

```typescript
// Node CRUD
addCard: () => void
deleteCard: (nodeId: string) => void
updateNode: (nodeId: string, patch: Partial<CardData>) => void
createReferenceConnection: (sourceNodeId: string, targetNodeId: string) => void

// Selection
setSelectedNode: (nodeId: string | null) => void
setSelectedNodes: (nodeIds: string[], primaryNodeId?: string | null) => void
toggleNodeSelection: (nodeId: string) => void
clearSelection: () => void

// Routing
setRoutedPaths: (paths: Record<string, Point[]>) => void
clearRoutedPaths: () => void
setEdgeColors: (colors: Record<string, string>) => void
setBundleEdges: (enabled: boolean) => void

// Puzzle matching pick mode
enterMatchingPickMode: (sourceNodeId: string) => void
confirmMatchingPick: (pickedNodeId: string) => void
commitMatchingPickMode: () => void
cancelMatchingPickMode: () => void

// Highlight / filter
toggleHighlightFilter: (filter: HighlightFilter) => void
setHighlight: (nodeIds: string[]) => void
clearHighlight: () => void

// Persistence
saveProject: () => Promise<void>           // JSON download
loadProject: (file: File) => Promise<void>
cloudSaveProject: () => Promise<void>      // Firestore setDoc
cloudLoadProject: () => Promise<void>      // Firestore getDoc
applyAIFormatImport: (rawText: string) => Promise<{ createdCount: number; updatedCount: number }>

// History
undo: () => void
redo: () => void
```

### Default state

```typescript
const defaultSlipTypes: SlipType[] = [
  { id: 'blue',   name: 'Blue Slip',   color: '#3b82f6' },
  { id: 'red',    name: 'Red Slip',    color: '#ef4444' },
  { id: 'green',  name: 'Green Slip',  color: '#22c55e' },
  { id: 'yellow', name: 'Yellow Slip', color: '#eab308' },
]
```

Two example cards (AA01 and AA02) are pre-populated as the initial state, one referencing the other.

---

## 5. Main App & Canvas

**File:** [src/App.tsx](src/App.tsx)

`App` is a thin wrapper that provides `ReactFlowProvider`. All real logic is in `BoardCanvas`.

### Component tree

```
App
└── ReactFlowProvider
    └── BoardCanvas
        ├── <svg> BiDirectionalEdgeMarkerDef   (hidden SVG defs)
        ├── NarrativeBodyPanel                  (full-screen, z-layer)
        ├── PuzzleFillPanel / ReorderPanel / MatchingPanel
        ├── CardEditorFlyout
        ├── mobile-sidebar-toggle button
        ├── sidebar-backdrop div
        ├── Sidebar
        └── .board-canvas div
            ├── ReactFlow
            │   └── <Background>
            ├── .selection-surface (marquee overlay)
            ├── .matching-pick-banner
            ├── ContextPanel
            └── .history-bar (toolbar)
```

### Edge decoration

Before passing edges to ReactFlow, `decoratedEdges` is computed via `useMemo` to add two data fields:

- `lateralShift`: fans edges leaving a common source so they spread at `±LANE_SPACING` (12px) increments
- `isOutgoingFromSelected`: true when either endpoint is the selected card (used by edge renderers to highlight)

```typescript
const LANE_SPACING = 12
const decoratedEdges = useMemo(() => {
  const sourceGroups: Record<string, string[]> = {}
  edges.forEach((edge) => {
    if (!sourceGroups[edge.source]) sourceGroups[edge.source] = []
    sourceGroups[edge.source].push(edge.id)
  })
  return edges.map((edge) => {
    const group = sourceGroups[edge.source] ?? []
    const indexInGroup = group.indexOf(edge.id)
    const groupSize = group.length
    const lateralShift = (indexInGroup - (groupSize - 1) / 2) * LANE_SPACING
    const isBidir = edge.data?.bidirectional === true
    const isOutgoingFromSelected =
      selectedNodeId !== null &&
      (edge.source === selectedNodeId || (isBidir && edge.target === selectedNodeId))
    return { ...edge, data: { ...edge.data, isOutgoingFromSelected, lateralShift } }
  })
}, [edges, selectedNodeId])
```

### ReactFlow configuration

```typescript
<ReactFlow
  panOnDrag={multiSelectMode ? false : [0, 1, 2]}  // Disable pan in select mode
  nodesDraggable={!multiSelectMode}
  onNodeDragStop={tidyLines}                        // Re-route after drag
  onMoveEnd={(_, viewport) => setViewport(viewport)}
  fitView
  minZoom={0.1}
  maxZoom={1.8}
/>
```

### Marquee selection

A custom pointer-events system runs parallel to ReactFlow (which handles node dragging). The `selection-surface` div overlays the canvas and captures pointer events.

```typescript
const DRAG_SELECT_THRESHOLD_PX = 6  // Ignore jitter below this distance

// Additive mode: dragging over a selected card deselects it, and vice versa.
// Toggle is against the frozen baseIds at drag start, not live state.
if (dragSelection.additive) {
  const covered = new Set(idsInBox)
  const baseInBox = new Set(dragSelection.baseIds.filter((id) => covered.has(id)))
  nextIds = [
    ...dragSelection.baseIds.filter((id) => !covered.has(id)),
    ...idsInBox.filter((id) => !baseInBox.has(id))
  ]
} else {
  nextIds = idsInBox  // Exclusive replace
}
```

Cards are found by querying `[data-card-id]` DOM attributes — no ReactFlow internal APIs needed.

- **Shift+drag on empty canvas:** exclusive marquee
- **multiSelectMode OR Ctrl+drag:** additive/subtractive marquee

### History bar CSS height variable

The history bar's height is published to a CSS custom property so the ContextPanel can sit above it without overlap:

```typescript
const observer = new ResizeObserver(() => {
  canvas.style.setProperty('--history-bar-height', `${bar.offsetHeight}px`)
})
observer.observe(bar)
```

---

## 6. Card Node Component

**File:** [src/components/NarrativeCardNode.tsx](src/components/NarrativeCardNode.tsx)

ReactFlow custom node type registered as `'narrativeCard'`.

### Visual states & CSS classes

```typescript
const cardClassName = [
  'card-shell relative overview',
  minimizedMode ? 'minimized' : '',
  isSelected     ? 'card-selected'    : '',
  isHighlighted  ? 'card-highlighted' : '',
  isDimmed       ? 'card-dimmed'      : '',
  hasPuzzle      ? 'has-puzzle'       : '',
  isPickSource   ? 'card-pick-source' : '',
  isPickTarget   ? 'card-pick-target' : '',
  isPickPicked   ? 'card-pick-picked' : '',
].join(' ')
```

### Zoom-aware ring widths

Ring/shadow sizes are expressed in flow-space pixels, then divided by current zoom to maintain a constant screen-pixel width:

```typescript
const { zoom } = useViewport()
const r = (px: number) => `${px / zoom}px`

// Usage in boxShadow:
const baseShadow = isSelected
  ? `0 0 0 ${r(2)} rgba(255,255,255,0.6)`
  : `0 0 0 ${r(2)} rgba(255,255,255,0.04)`
```

### Border & background

```typescript
style={{
  border: `7px solid ${slipColor}`,
  backgroundColor: '#0f1015',
  backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.02), rgba(255,255,255,0)),
                    linear-gradient(to bottom, ${slipColor}0d, ${slipColor}08)`,
  transform: isHighlighted ? `scale(${HIGHLIGHT_SCALE})` : undefined,
}}
```

### Click handler (desktop)

```typescript
function handleClick(event: React.MouseEvent) {
  if (matchingPickMode) { confirmMatchingPick(id); return }
  if (event.altKey)     { /* link mode: set/connect source */ return }
  if (event.ctrlKey || event.metaKey) { toggleNodeSelection(id); return }
  if (linkMode || connectionSourceNodeId) { /* link second click */ return }
  setSelectedNode(id)
  openContextPanel()
}
```

### Long-press (mobile link mode)

```typescript
const LONG_PRESS_MS = 400
const DRIFT_PX = 8  // Cancel long-press if touch moves more than 8px

longPressTimer.current = setTimeout(() => {
  longPressActivated.current = true
  setConnectionRef.current(id)  // Card becomes the link source
}, LONG_PRESS_MS)
```

Touch events use non-passive listeners (needed to call `event.preventDefault()`) registered imperatively on the div ref, not via JSX props, because React's synthetic event system doesn't support `{ passive: false }`.

### Contrast text for minimized band

```typescript
function getContrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const toLinear = (c: number) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
  return L > 0.35 ? '#3a3a3a' : '#f5f5f5'  // WCAG relative luminance
}
```

### Two rendering modes

- **OverviewContent:** Code badge, title, summary, slip-given dots, reference list (with border colors), puzzle badge, tags
- **MinimizedContent:** Colored band with title; compact slip dots, reference titles (no codes), puzzle type; no summary, no code

---

## 7. Edge Routing Pipeline

All edge routing files live in [src/components/edges/](src/components/edges/).

The pipeline has four layers, each building on the previous:

```
1. Floating Elbow (default, every frame)
      ↓ if elbow hits a card
2. A* Orthogonal Routing (on-demand via "Tidy Lines" button)
      ↓ if bundleEdges is on
3. Trunk Bundling (groups same-source edges onto a shared spine)
      ↓ after all routes computed
4. Endpoint Fanning (offsets arrivals/departures so they don't overlap on a card face)
```

### 7.1 Floating Elbow (`floatingEdge.ts`)

Default path drawn every frame. No obstacle avoidance — just a clean Z-shaped elbow.

**Anchor computation:** sides are chosen by comparing center-to-center deltas:
```typescript
function sideFacing(from: Rect, toward: Rect): Position {
  const dx = towardCx - fromCx
  const dy = towardCy - fromCy
  // Attach to the face that points toward the other card
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? Position.Right : Position.Left
  return dy >= 0 ? Position.Bottom : Position.Top
}
```

**Elbow geometry:**
```typescript
export function buildFloatingElbow(anchors: FloatingAnchors): Point[] {
  const { source, target, sourcePosition } = anchors
  const horizontal = sourcePosition === Position.Left || sourcePosition === Position.Right
  if (horizontal) {
    const midX = (source.x + target.x) / 2
    return [source, { x: midX, y: source.y }, { x: midX, y: target.y }, target]
  }
  const midY = (source.y + target.y) / 2
  return [source, { x: source.x, y: midY }, { x: target.x, y: midY }, target]
}
```

**Obstacle test:**
```typescript
export function polylineHitsObstacle(points: Point[], obstacles: Rect[]): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    for (const rect of obstacles) {
      if (segmentHitsRect(points[i], points[i + 1], rect)) return true
    }
  }
  return false
}
```

### 7.2 A* Pathfinding (`routeOrthogonal.ts`)

Orthogonal grid A* with turn-penalty to prefer straight runs over staircase paths.

**Key parameters:**
```typescript
const DEFAULT_GRID = 16      // Grid cell size in flow units
const DEFAULT_PADDING = 18   // Obstacle inflation margin
const TURN_PENALTY = 8       // Extra grid steps charged per direction change
```

**Stub points:** A* routes between *stub* points (offset from the card edge by `padding + grid`) rather than the on-card anchors, so the perpendicular exit/entry segments stay clean:
```typescript
const stubLen = padding + grid
const sStub: Point = {
  x: params.source.x + sDir.x * stubLen,
  y: params.source.y + sDir.y * stubLen,
}
```

**Hard directional constraints:**
- First move from start stub must follow the source side's outward normal (forces clean perpendicular exit)
- Goal stub may only be entered by moving against the target side's outward normal (forces clean perpendicular entry)

**Full path assembly:**
```typescript
const full: Point[] = [params.source, ...body, params.target]
return simplify(orthogonalize(full, params.sourcePosition))
```

`orthogonalize` inserts right-angle corners at any diagonal transitions. `simplify` drops collinear midpoints.

**SVG output:**
```typescript
export function pointsToPath(points: Point[]): string {
  const [first, ...rest] = points
  return `M ${first.x},${first.y} ` + rest.map((p) => `L ${p.x},${p.y}`).join(' ')
}
```

### 7.3 Trunk Bundling (`bundleEdges.ts`)

Groups all edges leaving a common source card. Within each exit side, they share a spine before branching.

**Constants:**
```typescript
const TRUNK_GAP = 48       // Distance from card edge to spine, in flow units
const LANE_STEP = 24       // How far to push spine outward per obstacle
const MAX_LANE_PUSH = 2000 // Safety cap
const ARRIVAL_FAN_STEP = 18 // Fan spacing at card faces
```

**Trunk clearance:** The spine is pushed outward until it no longer hits any non-participant card:
```typescript
for (let pushed = 0; pushed <= MAX_LANE_PUSH; pushed += LANE_STEP) {
  const candidate = sideFixed + sign * (TRUNK_GAP + pushed)
  const spine = [{ x: candidate, y: trunkSpanMin }, { x: candidate, y: trunkSpanMax }]
  if (!polylineHitsObstacle(spine, trunkObstacles)) {
    trunkFixed = candidate
    break
  }
}
```

**Tail routing:** Only the final branch (branch-point → target) is re-routed via A* if it crosses a card. The shared exit/trunk stay intact.

**Endpoint fanning:** `fanEndpointsAtCards` runs after all routes are built. It spreads arrivals and departures on each card face so multiple lines from different sources don't land on top of each other. Fan spacing is zoom-adjusted:
```typescript
const fanStep = ARRIVAL_FAN_STEP * Math.min(Math.max(1 / zoom, 1), 1.8)
```

### 7.4 On-demand routing hook (`useTidyLines.ts`)

```typescript
export function useTidyLines() {
  const { getNodes, getViewport } = useReactFlow()

  const tidyLines = useCallback(() => {
    // 1. Collect measured node rects from ReactFlow
    // 2. Inflate rects of highlighted cards by HIGHLIGHT_SCALE
    // 3. Run bundleEdgesBySource (or per-edge A* if bundling off)
    // 4. Store results in routedPaths via setRoutedPaths
    // 5. Update edgeColors
  }, [...])

  return tidyLines
}
```

`tidyLines` is called:
- Manually via the "Tidy Lines" button in the toolbar
- After `onNodeDragStop` (ReactFlow event)
- After `highlightedNodeIds` changes (highlighted cards grow via CSS, so routed paths must re-anchor)

**Auto-tidy debounce (900ms):** `useAutoTidy` clears routedPaths immediately on any change (so the live elbow shows at once), then schedules `tidyLines` to re-run after settling. The very first run is skipped so routing doesn't fire on load.

**Edge color sync:** `useSyncEdgeColors` keeps `edgeColors` in sync on every edge list change so colors are available even before `tidyLines` fires.

---

## 8. AI / DSL Format

**Files:** [src/ai/](src/ai/)

A plain-text format so LLMs can read and write card content. The top-level format uses `@CARD` blocks; each block embeds per-panel DSLs.

### Top-level @CARD block

```
@CARD AA01
TITLE: Forest Arrival
CARD_SLIP: Blue Slip
SLIP_GIVEN: Red Slip ×2, Green Slip
PUZZLE: Matching: Who left the door closed?
TAGS: Clue, Suspect

SUMMARY:
The protagonist reaches the remote town.

REFERENCES:
- AA02
- CV14

CONTENT:
Body text with **bold**, *italic*, __underline__.
END_CONTENT
```

### Narrative body DSL (`panelDSL.ts`)

HTML ↔ markdown-style markers:

| Marker | HTML |
|---|---|
| `**text**` | `<b>text</b>` |
| `*text*` | `<i>text</i>` |
| `__text__` | `<u>text</u>` |

```typescript
export function markdownToHtml(text: string): string {
  const lines = text.split('\n').map((line) => {
    let out = escapeHtml(line)  // XSS safety: escape before applying markers
    out = out.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    out = out.replace(/__([^_]+)__/g, '<u>$1</u>')
    out = out.replace(/\*([^*]+)\*/g, '<i>$1</i>')
    return out
  })
  return lines.join('<br>')
}
```

### Fill puzzle DSL

```
TEXT:
The suspect entered through the [[1]] at [[2]] o'clock.
END_TEXT
WORD_BANK: window, door, noon, midnight
ANSWERS:
1 = window
2 = midnight
END_ANSWERS
```

Blanks in `bodyHtml` are stored as `<span data-blank-id="uuid" class="puzzle-fill-blank">`. The DSL replaces them with `[[n]]` markers for readability.

### Reorder puzzle DSL

```
SOLUTION:
1. The suspect arrived at the estate.
2. Dinner was served.
3. The victim was found.
END_SOLUTION
SCRAMBLED: 3, 1, 2
```

### Matching puzzle DSL

```
QUESTION:
Which cards describe someone who was in the library?
END_QUESTION
CARDS:
- AA01 [solution] — Was reading near the east shelf
- AA02
- CV14 [solution] — Returned a book that evening
END_CARDS
```

### Import behavior

`importAIFormat` in [src/ai/importAIFormat.ts](src/ai/importAIFormat.ts):

1. Parses `@CARD` blocks via `parseAIBlocks`
2. Looks up each code against existing nodes
3. **New code:** creates a new card with `addCard` logic + generated position
4. **Existing code:** patches the card data with `updateNode`
5. Resolves slip names → ids (case-insensitive; falls back to first slip if unresolved)
6. Auto-creates tags encountered for the first time
7. Enforces `referenceSlipForms` minimums via `enforceGivenSlipMinimums`

Returns `{ createdCount, updatedCount }` for UI feedback.

---

## 9. Persistence & Cloud Storage

### Local JSON export/import

**Serialize:** [src/persistence/serializeProject.ts](src/persistence/serializeProject.ts)

```typescript
export function serializeProject(snapshot: ProjectSnapshot): SerializedProject {
  return {
    version: 1,
    metadata: {
      projectName: snapshot.metadata?.projectName ?? 'Mystery Board',
      createdAt: snapshot.metadata?.createdAt ?? new Date().toISOString(),
      updatedAt: snapshot.metadata?.updatedAt ?? new Date().toISOString(),
    },
    viewport: snapshot.viewport,
    edgeShapes: { ...(snapshot.edgeShapes ?? {}) },
    slipTypes: snapshot.slipTypes.map((item) => ({ ...item })),
    tags: snapshot.tags.map((item) => ({ ...item })),
    groups: snapshot.groups.map((group) => ({ ...group, nodeIds: [...group.nodeIds] })),
    nodes: snapshot.nodes.map((node) => ({ ...node, data: { ...node.data } }))
  }
}
```

**Deserialize:** [src/persistence/deserializeProject.ts](src/persistence/deserializeProject.ts) validates the parsed JSON against the schema before applying it to state. Invalid files are rejected with a user-visible error.

**Download filename:**
```typescript
export function createProjectFilename(prefix = 'mystery-board'): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.json`
}
```

### Reference integrity on load

After loading, `buildEdges` is called to re-derive edges from `referencesText`. This means edge data in the JSON is for routing hints only — the actual edges are always recomputed from node data.

---

## 10. Firebase Integration

**Files:** [src/firebase/](src/firebase/)

### Auth (`auth.ts`)

```typescript
// subscribeAuthState returns an unsubscribe function
export function subscribeAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback)
}
```

In `App.tsx`:
```typescript
useEffect(() => {
  return subscribeAuthState((user) => setCurrentUser(user))
}, [setCurrentUser])
```

Sign-in uses `signInWithPopup` (must be called from a user gesture — required for iOS popup blocker).

### Cloud storage (`cloudStorage.ts`)

**Path:** `users/{uid}/project/main` (one document per user)

```typescript
export async function cloudSaveProject(uid: string, project: SerializedProject): Promise<void> {
  const json = JSON.stringify(project)
  if (json.length > 900_000) {
    throw new Error('Project too large (~900 KB limit). Use "Export JSON" instead.')
  }
  await setDoc(projectDocRef(uid), { data: json, updatedAt: serverTimestamp() })
}

export async function cloudLoadProject(uid: string): Promise<CloudLoadResult> {
  const snap = await getDoc(projectDocRef(uid))
  if (!snap.exists()) return { found: false }
  const raw = snap.data()
  return {
    found: true,
    jsonText: raw['data'] as string,
    updatedAt: raw['updatedAt']?.toDate?.() ?? null,
  }
}
```

**CloudLoadResult discriminated union:**
```typescript
type CloudLoadResult =
  | { found: true; jsonText: string; updatedAt: Date | null }
  | { found: false }
```

---

## 11. Sidebar & Panels

### Sidebar (`src/components/Sidebar/`)

Three collapsible sections controlled by `sectionsOpen: SectionOpenState`:
- **boardControls** — project name, local save/load, cloud sync, AI format import
- **slipManager** — add/rename/delete slip types with color picker
- **cardEditor** — card field editing (code, refs, title, summary)

### ContextPanel (`src/components/ContextPanel.tsx`)

Floating panel anchored below the selected card. Uses CSS variable `--history-bar-height` to sit just above the toolbar.

Seven tabs, shown as a popover triggered from a row of buttons:
| Tab | Contents |
|---|---|
| Code & Refs | Card code editor, searchable reference list, slip-form toggles |
| Title / Summary | Text inputs |
| Card Slip | Slip type picker |
| Slip Given | Per-type count stepper |
| Tags | Searchable tag list, inline create |
| Puzzle Type | Mode selector, puzzle title/summary, open puzzle panel button |
| (none) | Closes popover on outside click |

### Full-screen panels

All opened via store actions (`openNarrativeBody`, `openPuzzleBody`) and rendered as overlays:
- **NarrativeBodyPanel:** Rich text editor for `body` field with DSL import/export
- **PuzzleFillPanel:** Fill-in-the-blank editor
- **PuzzleReorderPanel:** Drag-to-reorder editor
- **PuzzleMatchingPanel:** Matching puzzle editor with pick-mode entry

### Matching Pick Mode

A special global mode where all cards on the canvas become pick targets:

1. User opens PuzzleMatchingPanel → clicks "Pick Cards"
2. `enterMatchingPickMode(sourceNodeId)` sets `matchingPickMode = true`
3. Cards render with classes `card-pick-source` / `card-pick-target` / `card-pick-picked`
4. A banner overlays the canvas: "Click cards to add them to the puzzle"
5. Card clicks call `confirmMatchingPick(id)` to toggle in/out of `matchingPickStagedIds`
6. "Done" button → `commitMatchingPickMode()` merges staged ids into `puzzleMatchingContent.cards`

---

## 12. Graph Utilities

### buildEdgesFromReferences (`src/graph/buildEdgesFromReferences.ts`)

Converts node data into ReactFlow edges:

```typescript
export function buildEdgesFromReferences(nodes: NarrativeNode[]): NarrativeEdge[] {
  // 1. Collect all directed pairs from referencesText
  // 2. Build pairSet for O(1) bidirectional lookup
  // 3. For each pair:
  //    - Bidirectional? → single edge, type 'bidirectional', id 'bidir-A--B' (sorted)
  //    - Directed?      → single edge, type 'narrativeEdge', id 'A-B'
}
```

**Bidirectional detection:** if both `A→B` and `B→A` are in `directedPairs`, a single bidirectional edge replaces both. The canonical edge id is `bidir-` + sorted node ids joined with `--`.

### Slip form auto-minimum (`buildEdgesFromReferences.ts`)

When a reference has its "slip form" toggle on, the referenced card's slip type is automatically added to this card's `slipGivenTypeIds` as a minimum:

```typescript
export function enforceGivenSlipMinimums(
  node: NarrativeNode,
  allNodes: NarrativeNode[]
): string[] {
  const given = node.data.slipGivenTypeIds ?? []
  const autoIds = autoGivenSlipIds(node, allNodes)  // one id per toggled reference
  // For each slip type, ensure count >= minimum from auto; preserve manual extras above
  const result = [...given]
  const minByType = new Map<string, number>()
  for (const id of autoIds) minByType.set(id, (minByType.get(id) ?? 0) + 1)
  for (const [slipId, min] of minByType) {
    const have = result.filter((id) => id === slipId).length
    for (let i = have; i < min; i++) result.push(slipId)
  }
  return result
}
```

### generateNextCode (`src/graph/generateNextCode.ts`)

Auto-increments card codes in the pattern `AA01`, `AA02`, … `AZ99`, `BA01`, …

```typescript
export function generateNextCode(existingCodes: string[]): string {
  const index = existingCodes.length
  const first  = LETTERS[Math.floor(index / (26 * 99)) % 26]
  const second = LETTERS[Math.floor(index / 99) % 26]
  const number = (index % 99) + 1
  return first + second + String(number).padStart(2, '0')
}
```

### tagLogos (`src/graph/tagLogos.ts`)

Computes a minimal non-colliding single-character glyph for each tag (used in card overviews). Uses tag name initials and resolves collisions by walking the alphabet.

---

## 13. Styling Architecture

**Approach:** BEM class naming, no CSS Modules, no Tailwind. Dark theme throughout.

| File | Lines | Covers |
|---|---|---|
| `App.css` | ~320 | Board layout, history bar, marquee surface, groups panel, mobile media queries |
| `styles/card.css` | ~1897 | Card shells (overview + minimized), all puzzle panels, edge markers, narrative body panel, mobile overrides |
| `styles/sidebar.css` | — | Sidebar structure, collapsible sections |
| `styles/utilities.css` | — | Reusable utility classes |

### Color system

- Background: `#0f1015`
- Surface text: `#f4f4f5`
- Card border: slip color (7px solid)
- Card tint: `${slipColor}0d` and `${slipColor}08` gradient overlays
- Selected ring: `rgba(255,255,255,0.6)`
- Highlighted ring: white glow + `scale(1.15)` transform

### Responsive / mobile

Media queries in `App.css` and `card.css`:
- Sidebar collapses to a hamburger toggle on mobile/tablet
- A backdrop div closes the sidebar on outside tap
- Hamburger is hidden while full-screen panels or context panel are open (avoids overlap)
- Input `font-size: 16px` is enforced on mobile to prevent iOS zoom-on-focus

---

## 14. Testing

**Framework:** Vitest (Vite-native, no Jest)

| File | Tests | Covers |
|---|---|---|
| `src/ai/aiFormat.test.ts` | 13 | Full DSL round-trip: body, fill, reorder, matching; slip resolution; tag auto-creation; slip form minimums |
| `src/components/edges/bundleEdges.test.ts` | — | Trunk bundling correctness |
| `src/components/edges/floatingEdge.test.ts` | — | Elbow geometry, obstacle detection |
| `src/components/edges/MovableEdge.test.ts` | — | Edge renderer |
| `src/components/edges/routeOrthogonal.test.ts` | — | A* routing correctness |
| `src/graph/tagLogos.test.ts` | — | Tag glyph collision resolution |
| `src/types/narrative.test.ts` | — | Type-only validation |

Run with: `npm test` (or `npx vitest`)

---

## 15. Key Constraints & Limitations

| Constraint | Detail |
|---|---|
| **Firestore size limit** | Projects must be <900 KB when JSON-stringified. The save function throws with a user-visible error above this threshold. |
| **No real-time sync** | Cloud save/load is manual. No Firestore `onSnapshot` subscriptions — no live multiplayer. |
| **A* is opt-in** | `routeOrthogonal` only runs when the user clicks "Tidy Lines" or after a 900ms drag-settle debounce. It never runs every frame. |
| **edgeShapes dormant** | Per-edge middle-segment offset adjustment is stored in state and serialized but not exposed in the UI. |
| **One project per user** | Firestore path is `users/{uid}/project/main` — a single document. No multi-project support. |
| **No URL routing** | Single-page application. No browser history / back-button integration. |
| **Touch: long-press only** | Mobile link mode requires a 400ms hold. Double-tap is not used for any action. |
| **Tag glyphs are best-effort** | `computeTagLogos` resolves collisions locally but does not guarantee uniqueness across all possible tag names. |
