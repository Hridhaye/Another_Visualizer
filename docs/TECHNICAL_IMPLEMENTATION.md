# Another Visualizer — Technical Implementation Reference

## 1. Purpose of this codebase

This project is a React + TypeScript application for authoring and visualizing a narrative board. The main interactive surface is a React Flow canvas where cards represent narrative fragments, references between cards create edges, and the sidebar/editor panels support metadata editing, grouping, puzzle configuration, and project import/export.

The current implementation is intentionally structured as a stateful board editor with:

- a central Zustand store for board state and mutations,
- React Flow for canvas rendering and node/edge editing,
- custom card and edge renderers for story-specific UI,
- a small persistence layer for JSON export/import,
- an AI text DSL pipeline for importing and exporting card definitions.

---

## 2. Runtime stack

### Core framework
- Vite for development/build tooling
- React 19 + TypeScript
- React Flow for nodes, edges, drag, pan, and selection behavior
- Zustand for global board state

### Key dependencies
- reactflow: board UI, node/edge primitives, drag interactions
- zustand: single-store application state with action methods
- vitest: unit tests for AI DSL and core logic helpers

### Build / lint commands
- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run lint` — ESLint validation

---

## 3. High-level architecture

The app is split into four layers:

1. View layer
   - `src/App.tsx` composes the board, sidebar, and overlay panels.
   - `src/components/` contains card nodes, editor panels, grouping UI, and puzzle-specific panels.

2. State layer
   - `src/store/useNarrativeBoardStore.ts` owns the full board model and mutation logic.
   - Zustand actions update nodes, edges, groups, tags, slip types, selection, and history.

3. Domain / graph layer
   - `src/types/narrative.ts` defines the canonical card, edge, puzzle, and project types.
   - `src/graph/` contains rules for generating edges from references and helper utilities such as next-code generation and tag logos.

4. Persistence / AI layer
   - `src/persistence/` validates and serializes JSON project files.
   - `src/ai/` parses, validates, imports, and exports the custom AI narrative DSL.

---

## 4. Canonical data model

### 4.1 Narrative card shape
The card model is defined in `src/types/narrative.ts` as `NarrativeNode = Node<CardData>`.

Each card contains:
- `id`: React Flow node id
- `type`: currently `narrativeCard`
- `position`: canvas coordinates
- `data`: card content and metadata

`CardData` includes:
- `code`: short card identifier such as `AA01`
- `title`, `summary`, `body`: narrative content
- `slipTypeId`: the slip category used for styling and display
- `slipGivenTypeIds`: the “slip given” list used in the puzzle / narrative logic
- `referencesText`: comma-separated card codes that this card references
- `referenceSlipForms`: optional toggles that auto-expand slip-given minimums
- `tagIds`: assigned project tags
- `puzzleType`, `puzzleSummary`
- `puzzleFillContent`, `puzzleReorderContent`, `puzzleMatchingContent`: optional puzzle-specific content

### 4.2 Puzzle type system
Puzzle support is controlled through `PUZZLE_TYPES`:
- `none`
- `fill`
- `reorder`
- `matching`

The current card renderer uses `getPuzzleDisplayText()` to show a compact label in the UI.

### 4.3 Slip types and tags
Slip types and tags are project-wide registries:
- `SlipType = { id, name, color }`
- `Tag = { id, name }`

These are separate from node content but are referenced by card data.

### 4.4 Groups
`CardGroup` stores a collection of node ids and a display name. Groups are used for multi-card organization and selection workflows, not for edge generation.

---

## 5. Store architecture

The central store in `src/store/useNarrativeBoardStore.ts` is a single Zustand slice with two major parts:

### 5.1 State
The store holds:
- `nodes`, `edges`
- `selectedNodeId`, `selectedNodeIds`
- `groups`, `slipTypes`, `tags`
- `sidebarCollapsed`, `sectionsOpen`
- `contextPanelOpen`, `narrativeBodyOpen`, `puzzleBodyOpen`, `activeEditorField`
- `multiSelectMode`, `matchingPickMode`, `highlightedNodeIds`, `activeGroupId`
- `historyPast`, `historyFuture`, `canUndo`, `canRedo`
- `metadata`, `viewport`, `hasUnsavedChanges`

### 5.2 History and undo/redo
Every mutation that changes board state pushes a deep snapshot into `historyPast` and clears `historyFuture`.

The snapshot logic is implemented by `createSnapshot(state)`, which clones:
- nodes and node data
- edges
- groups
- slip types
- tags
- selection state
- metadata
- viewport

This makes undo/redo reliable for card edits, link creation, grouping, import operations, and canvas movement.

### 5.3 Action model
The store implements a large action surface:
- `addCard`, `deleteCard`, `updateNode`
- `createReferenceConnection`
- `addSlipType`, `renameSlipType`, `deleteSlipType`
- `addTag`, `renameTag`, `deleteTag`
- `assignTagToNode`, `unassignTagFromNode`
- `createGroupFromSelection`, `toggleSelectionInGroup`, `selectGroup`, `deleteGroup`
- `saveProject`, `loadProject`, `applyAIFormatImport`
- `setSelectedNode`, `setSelectedNodes`, `toggleNodeSelection`, `clearSelection`
- `undo`, `redo`

This is the primary integration point for UI controls and editor panels.

---

## 6. How the board renders

### 6.1 `src/App.tsx`
`App.tsx` is the composition root.

It wires together:
- `ReactFlow` canvas
- custom `NarrativeCardNode`
- custom edge components (`NarrativeEdge`, `BiDirectionalEdge`)
- `Sidebar`
- `ContextPanel`
- `NarrativeBodyPanel`
- `PuzzleFillPanel`, `PuzzleReorderPanel`, `PuzzleMatchingPanel`
- `CardEditorFlyout`

It also adds selection helpers:
- marquee drag selection for multi-card selection
- keyboard shortcuts for undo/redo (`Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`)
- viewport persistence on drag / move completion

### 6.2 Custom node behavior
`NarrativeCardNode.tsx` handles:
- click selection
- multi-select with Ctrl/Cmd
- alt-click reference linking
- touch long-press for linking
- highlighting and group badges
- puzzle badges and tag logo rendering

This component also uses `Handle` from React Flow to provide left/right connection anchors for the visual graph.

---

## 7. Reference graph and edge generation

### 7.1 Source of truth for references
Card references are stored in `node.data.referencesText`, which is a comma-separated list of card codes such as `AA02, BB03`.

The reference parser in `src/graph/buildEdgesFromReferences.ts` is simple and deterministic:
- split by comma
- trim whitespace
- filter out empty strings

### 7.2 Edge creation rules
`buildEdgesFromReferences(nodes)` generates the edge list from the reference text.

Key behavior:
- every reference creates a directed edge from the source card to the referenced card
- if both directions exist, the edge is rendered as a bidirectional `bidirectional` edge instead of two arrows
- bidirectional edges are de-duplicated using a canonical sorted key

This means the board graph is derived from content, not manually maintained.

### 7.3 Slip-form minimum enforcement
The helper `enforceGivenSlipMinimums()` uses `referenceSlipForms` to ensure the card’s `slipGivenTypeIds` includes enough slip types to satisfy the toggled-on reference form requirements.

This gives the app a small amount of derived logic: the UI can mark that “this card should automatically include the referenced card’s slip type as a given slip”, and the store will top up the list as needed.

---

## 8. Persistence model

### 8.1 Export format
The serialized project format is defined in `src/types/narrative.ts` as a versioned JSON structure:
- `version: 1`
- `metadata`
- `viewport`
- `slipTypes`
- `tags`
- `groups`
- `nodes`

`serializeProject()` produces a safe copy of the board snapshot.

### 8.2 Validation and normalization
`validateProject()` is defensive:
- checks the JSON object shape
- validates the supported `version`
- normalizes missing metadata, viewport values, groups, tags, and card bodies to safe defaults
- rejects unsupported or malformed project files

This makes the import path forgiving for older or partially broken exports.

### 8.3 Import flow
`deserializeProject()` wraps `JSON.parse()` + validation and turns malformed imports into user-facing errors.

The store’s `loadProject()` operation:
1. verifies the file extension,
2. confirms replacement if unsaved changes exist,
3. parses and validates the input,
4. rebuilds edges from references,
5. resets selection and history state.

---

## 9. AI DSL pipeline

The app includes a small text DSL for importing/exporting narrative cards from plain text. This is the most important extension point for future automation.

### 9.1 Parsing
`src/ai/parseAIBlocks.ts` parses blocks in the format:

```text
@CARD AA01
TITLE: Forest Arrival
CARD_SLIP: Blue Slip
SLIP_GIVEN: Red Slip ×2
TAGS: Mystery, Intro
PUZZLE: Fill: clue text
SUMMARY:
The protagonist reaches the town.
REFERENCES:
- AA02
CONTENT:
The full body text goes here.
END_CONTENT
```

The parser supports:
- `SUMMARY:` blocks that collect multi-line text until the next directive
- `REFERENCES:` blocks that accept bullet or comma-separated references
- `CONTENT:` / `END_CONTENT` blocks for longer narrative bodies

### 9.2 Validation
`validateAIFormat()` enforces:
- each card must have a code
- duplicate codes are rejected
- titles are required for new cards
- puzzle types must be one of the known values
- `CONTENT:` blocks must be closed with `END_CONTENT`

This protects the import pipeline from malformed DSL input.

### 9.3 Import behavior
`importAIFormat()` performs the actual merge:
1. parses the DSL text into `AIBlock[]`
2. validates the structure
3. matches existing cards by `code`
4. updates existing cards or creates new ones
5. resolves slip types and tags by name/id
6. normalizes puzzle metadata
7. rebuilds edges and returns stats for created vs updated cards

Import logic is deliberately not purely additive:
- existing cards are updated in place when codes match
- new cards are added at generated positions
- tags are created lazily when referenced in the DSL

### 9.4 Export behavior
`exportAIFormat()` serializes node data into deterministic DSL text. It sorts cards by code and emits:
- `@CARD`
- `TITLE:`
- `CARD_SLIP:`
- `SLIP_GIVEN:`
- `TAGS:`
- `PUZZLE:`
- `SUMMARY:`
- `REFERENCES:`

This makes the DSL useful for round-tripping story content between the app and external editing tools.

---

## 10. Interaction model and user flows

### 10.1 Card creation
The `Add Card` button calls `addCard()` in the store.

This uses `generateNextCode()` to create the next sequential code (for example `AA01`, `AA02`, `AA03`).

### 10.2 Card linking
The app supports a lightweight link workflow:
- long-press on mobile, or alt-click on desktop, selects a link source
- a second click on another card creates a reference and edge
- the same action toggles the link on/off

This is implemented directly in `NarrativeCardNode.tsx` and `createReferenceConnection()`.

### 10.3 Selection and grouping
The app supports both single-card and multi-card workflows:
- normal click selects one card
- Ctrl/Cmd click toggles cards into a selection set
- Shift-drag / marquee selection supports bulk selection
- groups can be created from selected cards

Group membership is stored in `CardGroup.nodeIds`, and the UI highlights cards belonging to active groups.

### 10.4 Puzzle authoring
Puzzle content is stored in the card data, and the puzzle panels (`PuzzleFillPanel`, `PuzzleReorderPanel`, `PuzzleMatchingPanel`) are separate UI surfaces for editing puzzle-specific fields.

The board itself is not responsible for puzzle solving; it is primarily an authoring and navigation surface.

---

## 11. Current extension points for future work

The codebase is well positioned for expansion in the following places:

1. AI DSL enhancements
   - extend `parseAIBlocks()` for additional directives
   - support richer puzzle serialization
   - add structured validation for references and slip form metadata

2. More sophisticated graph rules
   - replace simple code-based reference matching with explicit ids
   - support edge labels, weights, or categories

3. Persistence upgrades
   - add schema migrations for future project versions
   - support cloud sync / collaborative revision history

4. Editor and authoring improvements
   - centralize more card controls in shared editor components
   - add typed puzzle editors for each puzzle type

5. Testing
   - add integration tests around `useNarrativeBoardStore`
   - add end-to-end tests for import/export and grouping workflows

---

## 12. Engineering notes

- The app currently relies on content-derived edges rather than storing a separate edge model. This is efficient but means edge reconstruction is always tied to `referencesText`.
- The persistence layer is intentionally permissive and defensive. That is useful for forward compatibility but should be revisited once the project format stabilizes.
- The AI DSL parser is robust enough for authoring workflows but still uses string heuristics for some block parsing. It is a good candidate for a formal grammar or structured parser if the DSL grows.
- The store is large and action-driven. It works well for the current scope but will benefit from decomposition into smaller modules if the board becomes more complex.

---

## 13. Summary

The app is a custom narrative board authoring tool built on React Flow + Zustand. Its core implementation revolves around:

- derived graph edges from narrative references,
- a rich card data model with puzzle support,
- one central store for state and history,
- JSON project persistence,
- and an AI DSL import/export pipeline.

This makes the codebase a practical foundation for future refactors, richer puzzle types, collaborative workflows, or external story-authoring integrations.
