# Another Visualizer – Technical Implementation Reference

## 1. Purpose of this codebase

This project is a React + TypeScript + React Flow application for creating and managing a narrative card board. The board is built around:

- a graph of cards (nodes)
- directed references between cards (edges)
- slip-type coloring and tags
- puzzle metadata attached to cards
- project serialization / import / export
- a Zustand store that acts as the single source of truth for app state

The current implementation is suitable for rapid visual authoring and lightweight board editing. It is also structured so it can be refactored into a more modular graph authoring system later.

---

## 2. Core technology stack

Runtime:
- React 19
- TypeScript
- Vite
- Zustand
- React Flow (graph canvas / node system / edge system)

Supporting libraries:
- ELKJS is present in package.json but is not currently used in the working runtime path
- Vitest is available for unit tests

Key entry points:
- src/main.tsx
- src/App.tsx
- src/store/useNarrativeBoardStore.ts

---

## 3. Application architecture

### 3.1 High-level control flow

1. App bootstraps React Flow provider and renders the board canvas.
2. Zustand store loads the initial narrative graph.
3. React Flow renders cards as custom node components and edges as custom edge components.
4. User interaction updates store state.
5. Store recomputes derived graph structures (edges, groups, selection state, history snapshots).
6. Persistence and AI-format import/export utilities operate on the store contents.

### 3.2 Main runtime layering

- UI shell and layout: src/App.tsx
- State and business logic: src/store/useNarrativeBoardStore.ts
- Card rendering: src/components/NarrativeCardNode.tsx
- Edge rendering and routing: src/components/edges/*
- Data models: src/types/narrative.ts
- Persistence: src/persistence/*
- AI import/export: src/ai/*
- Styles: src/styles/* and src/App.css

---

## 4. State model and data flow

### 4.1 Central state store

The central store is implemented as a Zustand store in src/store/useNarrativeBoardStore.ts.

It owns:
- nodes
- edges
- edgeShapes
- routedPaths
- edgeColors
- slipTypes
- tags
- groups
- selection state
- UI flags (sidebar, sections, overview mode, multi-select mode, link mode, matching mode)
- metadata and viewport
- undo / redo history
- unsaved-change tracking

This store is intentionally broad: almost every interaction is routed through it rather than being split across isolated feature modules.

### 4.2 Important state responsibilities

- Node updates and card creation are handled in the store.
- Edge regeneration is driven from node references, not from an independent graph store.
- The store computes history snapshots to support undo / redo.
- The store also persists project metadata and viewport information.

### 4.3 Why the store matters

The store is the backbone of the codebase because:
- node and edge state are always derived from a single authoritative source
- UI panels and canvas components all consume the same store
- AI import and project load / save are implemented as store actions, not separate services

---

## 5. Core data structures

### 5.1 Narrative card model

Cards are typed as `NarrativeNode` in src/types/narrative.ts, where the node data contains:

- code
- title
- summary
- body
- slipTypeId
- slipGivenTypeIds
- referencesText
- referenceSlipForms
- tagIds
- puzzleType
- puzzleSummary
- puzzleFillContent
- puzzleReorderContent
- puzzleMatchingContent

This is a flexible authoring model rather than a rigid content schema.

### 5.2 Edge model

Edges are generated from card references. The source of truth for reference relationships is `referencesText` on each card.

Reference semantics:
- each card stores a comma-separated list of target card codes in `referencesText`
- the graph builder converts those codes into directed edges
- if a reverse edge exists, a single bidirectional edge is emitted instead of two separate arrows

This means the graph is not manually maintained by the user; it is derived from card content.

### 5.3 Slip types and tags

- `slipTypes` determine card color and slip-token labels
- `tags` are project-wide metadata labels that can be attached to nodes
- `groups` allow the user to combine multiple selected cards into a logical collection

---

## 6. Reference-to-edge generation

The main algorithm is in src/graph/buildEdgesFromReferences.ts.

### 6.1 How edges are created

1. Every node is scanned for `referencesText`.
2. Each reference code is resolved to a matching card via `candidate.data.code`.
3. Directed pairs are collected.
4. A reverse pair is detected to collapse the pair into a single bidirectional edge.
5. Standard directed edges are emitted with arrow markers.

This makes the graph a projection of card references rather than a separate manual graph model.

### 6.2 Why this is important

This is one of the central design choices in the project:
- changes to one card automatically affect the edge network
- graph structure is easy to regenerate after import or load
- the store can rebuild edges without needing a separate graph editor layer

---

## 7. Card rendering and interaction model

### 7.1 Card node component

The main card renderer is src/components/NarrativeCardNode.tsx.

It handles:
- card selection and click behavior
- drag / long-press interaction
- link mode for connecting cards
- matching-pick mode for puzzle authoring
- overview-mode rendering vs standard card rendering
- tag logo badges and puzzle badges

Interaction logic is intentionally embedded in the node itself, which keeps the visual component expressive but also makes refactoring more complex later.

### 7.2 Click semantics

Current interaction rules include:
- normal click: select card and open context panel
- Ctrl / Cmd click: multi-select card
- Alt click: direct link mode interaction
- Link mode: click source card, then target card to create a reference
- Matching mode: click cards to stage them into a puzzle association

This is a fairly rich interaction layer for a small graph board.

### 7.3 Overview mode

The board supports an `overviewMode` toggle. When enabled, cards render in a smaller, distance-readable format via the `OverviewContent` subcomponent.

This is a runtime-only view preference and currently exists as a UI option rather than a full alternative board mode.

---

## 8. Edge rendering and line routing

### 8.1 Default edge rendering

The default edge renderer is src/components/edges/MovableEdge.tsx.

It uses:
- a floating elbow default path
- a highlight mechanism for selected source relationships
- edge colors from the current slip-type palette

### 8.2 Tidy Lines and obstacle avoidance

The main route logic lives in src/components/edges/useTidyLines.ts.

Behavior:
- the default edge path is a lightweight floating elbow
- when the user activates “Tidy Lines”, the app computes obstacle-avoiding paths using the current node rectangles
- these paths are stored as `routedPaths` in the store
- edge colors are recalculated after routing

This is an opt-in path planner rather than a continuous real-time algorithm.

### 8.3 Legacy / dormant connector-offset feature

The codebase still contains offset-related code:
- `edgeShapes` in the store
- `setEdgeOffset`
- `resolveEdgeOffset()`
- `useSegmentDrag.ts`
- `edgeOffset.ts`

These support a manual middle-segment offset feature for connectors. The code comments explicitly say this feature is kept but unused. It will be removed in a future refactor.

This is important for future work because the project currently carries both:
- live routing logic
- dormant manual offset persistence

That is legacy complexity and should be treated as technical debt.

---

## 9. Persistence and project serialization

### 9.1 Save flow

Project export is implemented in src/persistence/serializeProject.ts.

It serializes:
- nodes
- slip types
- tags
- groups
- viewport
- metadata
- edgeShapes (legacy offset data)

The save path writes a versioned JSON document to the browser download stream.

### 9.2 Load flow

Project import is implemented through:
- src/persistence/deserializeProject.ts
- src/persistence/validateProject.ts

On load:
- raw JSON is parsed
- structure is validated
- invalid or missing fields are normalized into safe defaults
- nodes and edges are reconstructed
- selected state is reset to the first loaded card

The validation layer is deliberately defensive, which helps prevent broken saved files from crashing the board.

### 9.3 Why this matters

The persistence model is not just a file export. It is also part of the app’s runtime contract:
- history snapshots depend on the same shapes
- edge offset metadata survives load/save in the current code path
- import/export behavior is intentionally kept independent from the live canvas renderer

---

## 10. AI format import/export

The AI-format pipeline lives in src/ai/.

### 10.1 Export path

src/ai/exportAIFormat.ts converts node data into a human-readable block format.

It includes:
- card code
- title
- slip type
- slip-given data
- tags
- puzzle summary
- references

### 10.2 Import path

src/ai/importAIFormat.ts parses the AI block format and updates the current board.

Important behavior:
- existing cards are updated by code
- missing cards are created
- tag IDs are resolved and created lazily
- puzzle metadata is normalized
- slip-given minima are enforced after import

This is the strongest example of “authoring DSL → board state” conversion in the codebase.

---

## 11. Puzzle and authoring features

The card model supports multiple puzzle types:
- none
- fill
- reorder
- matching

These are represented in src/types/narrative.ts and are consumed by the puzzle panels in src/components/.

The main authoring support is:
- puzzle summary text
- puzzle-specific content objects for fill / reorder / matching
- matching-screen selection mode for staging puzzle cards

This means the tool is not only a graph board; it also stores narrative authoring metadata and puzzle structures tied to nodes.

---

## 12. UI shell and layout composition

The app shell in src/App.tsx composes several visible areas:
- sidebar controls
- narrative body panel
- puzzle panels
- card editor flyout
- context panel
- history controls
- interactive React Flow canvas

The board root is a composition of UI modules, not a single monolithic component. This is one of the app’s main strengths for future refactoring.

Key UI features:
- collapsible sidebar sections
- drag-to-select multi-card behavior
- history buttons (undo / redo)
- groups panel
- link mode
- matching mode
- minimap support

---

## 13. Notable implementation details worth remembering

1. Edge references are derived from `referencesText`, not stored independently.
2. The store is the central source of truth for all interaction state.
3. The graph is rebuilt from node references on many state transitions.
4. Tidy-line routing is opt-in and uses obstacle-aware pathfinding only when requested.
5. A manual connector-offset system exists in the current codebase but is dormant / unused.
6. The “Detailed View” mode is part of the current UI, but the user has flagged it as soon to be removed.
7. ELKJS is present in dependencies but not used in the current runtime path.

---

## 14. Refactor guidance for future engineers

If this tool is going to be expanded, the most important areas to isolate are:

1. Replace the broad Zustand store with smaller domain modules
   - board state
   - selection / interaction state
   - persistence
   - routing

2. Separate the graph model from the presentation model
   - references should stay declarative
   - rendering should not depend on ad-hoc store-driven UI logic

3. Remove or archive legacy connector-offset code
   - `edgeShapes`, `setEdgeOffset`, `manualOffset`, and related helpers are dead / dormant complexity

4. Decide whether the detailed card renderer is still part of the product
   - the overview rendering path is currently the simpler path
   - the detailed renderer is likely to be phased out

5. Keep the AI import/export format as a stable boundary
   - this is already a useful authoring abstraction and should remain isolated from the canvas internals

---

## 15. Summary

The current implementation is a React Flow + Zustand authoring surface for narrative cards whose graph topology is derived from reference text. It combines:
- visual graph editing
- board state management
- puzzle metadata
- project persistence
- AI-format import/export

It is feature-rich but contains some legacy complexity around connector-offset handling and detailed card rendering. Those areas are the most likely candidates for cleanup during the next refactor cycle.
