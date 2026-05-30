# Performance analysis — why the board stalls at 150 cards

Analysis only. No code changed. Three independent bottlenecks, ranked by how much they hurt. #1 alone explains the freeze-on-stop; #2 explains the sluggish drag/pan.

---

## #1 — The freeze when a card stops moving: `tidyLines()` runs synchronous A* over the whole board

`onNodeDragStop={tidyLines}` ([App.tsx:517](src/App.tsx#L517)) runs [`tidyLines`](src/components/edges/useTidyLines.ts#L46) **synchronously on the main thread** the instant you release a card. There is no debounce, no `requestIdleCallback`, no worker. The UI is blocked until it finishes — exactly the "snap, then freeze" you described.

What `tidyLines` does at 150 cards / ~150–300 edges, every drag-stop:

1. **Builds a fresh obstacle array per edge by iterating *all* rects** — `rects.forEach` inside the `edges.forEach` loop ([useTidyLines.ts:98-101](src/components/edges/useTidyLines.ts#L98)). That's O(edges × cards) ≈ 150 × 150 = ~22k allocations before any routing.

2. **Runs `bundleEdgesBySource` over every edge** ([bundleEdges.ts](src/components/edges/bundleEdges.ts)). For each source group it builds *more* per-edge obstacle arrays by scanning all rects again ([bundleEdges.ts:136, 186](src/components/edges/bundleEdges.ts#L136)), sorts, and probes a trunk lane outward up to `MAX_LANE_PUSH=2000` in `LANE_STEP=24` steps (~83 `polylineHitsObstacle` scans, each O(cards)). Then `fanEndpointsAtCards` does another full endpoint sweep.

3. **For every blocked edge, runs A\* (`routeOrthogonal`) on a grid spanning the bounding box of its endpoints + obstacles.** This is the killer. The seed spreads 150 cards across a ~5400×2800 flow area. For an edge spanning much of that, with `grid=16`:
   - grid = **338 × 175 = ~59,000 cells**
   - `maxIterations = cells × 4 = ~236,000`
   - the open set is a **plain array with a linear scan for the min** every pop ([routeOrthogonal.ts:186-190](src/components/edges/routeOrthogonal.ts#L186)) → on the order of O(cells²) in the worst case
   - `blocked(col,row)` calls `obstacles.some(...)` over **all ~150 rects per visited cell** ([routeOrthogonal.ts:130-134](src/components/edges/routeOrthogonal.ts#L130)) → up to **~8.9 million rect-checks for a single long edge**

   Multiply by however many edges are "blocked" and you get hundreds of milliseconds to seconds of blocking main-thread work on **every drag release**. With the seed (each card references the next two), many edges cross neighbors and trigger A*.

`tidyLines` is also fired on every highlight change ([App.tsx:238](src/App.tsx#L238)), so toggling a highlight filter at scale freezes the same way.

**Why it's structural:** A* obstacle routing is inherently expensive and was designed as an opt-in "Tidy Lines" button. Wiring it to `onNodeDragStop` makes every drag pay the full cost. The router itself is also unoptimized (linear-scan open set, per-cell O(cards) blocked test, grid sized to the whole board rather than the edge's local corridor).

---

## #2 — Sluggish drag/pan: React re-renders the whole node + edge layer every frame

Independently of A*, moving a card or panning is slow because the React tree does too much per frame.

- **`decoratedEdges` recomputes + clones every edge on every render**, and every render happens each drag frame because `nodes` changes. [App.tsx:156-187](src/App.tsx#L156): it spreads `{...edge, data: {...edge.data, …}}` for **all** edges, producing brand-new `data` objects each time. New `data` identity defeats `React.memo` on the edge components → **every edge re-renders every frame**, even off-screen ones that slipped past culling. At 150–300 edges that's a full edge-layer reconciliation 60×/sec.

- **`rfNodes` maps all nodes every render** ([App.tsx:200-ish](src/App.tsx)) to mirror selection. The identity-preserving guard helps React skip unchanged *cards*, but the `.map` over all nodes plus a `new Set(selectedNodeIds)` still runs every frame, and ReactFlow still diffs the full node array.

- **`onlyRenderVisibleElements` is on but only helps nodes.** With the seed laid out in a wide grid, a fit-to-view shows most of them, so culling buys little. Edges are not meaningfully culled here.

- **Each card still holds ~17 individual `useNarrativeBoardStore` subscriptions** ([NarrativeCardNode.tsx](src/components/NarrativeCardNode.tsx)). Even though they're primitive now, every one runs its selector on *every* store `set()`. A drag frame is a `set()`, so that's 150 cards × 17 selectors = ~2,550 selector evaluations per frame just to (usually) decide nothing changed. Plus `isGroupSelected` does a `groups.find` per card per set.

- **`App` itself subscribes to ~40 store slices** and re-renders fully on any of them; `activeNode = nodes.find(...)` ([App.tsx:442](src/App.tsx#L442)) is an O(N) scan on every App render.

**Why it's structural:** the edge `data` is recomputed and re-cloned on a cadence tied to node movement, and selection/decoration are recomputed in `App` (which re-renders constantly) rather than being pushed into stable, per-element state. ReactFlow can render thousands of static nodes fine; it struggles when the host hands it freshly-identitied node/edge arrays every frame.

---

## #3 — History snapshots deep-clone the entire board

[`pushHistory`](src/store/useNarrativeBoardStore.ts) / `createSnapshot` deep-clone **all nodes, edges, groups, slips, tags** on every undoable mutation. At drag-start that's one big clone (acceptable), but every `addCard`, `updateNode`, slip edit, etc. clones the whole 150-card board, and the stack holds up to 50 of them. This isn't the per-frame killer, but it adds GC pressure and multi-MB allocations on common edits, and compounds the jank. (The one-snapshot-per-drag guard from the last pass is working — this is about non-drag edits.)

---

## What a real fix looks like (for the follow-up plan)

The theme: **the edge-routing system is the dominant cost and is architecturally mismatched with "must be smooth at 150+ cards."** Ranked:

1. **Decouple A* from interaction.** Don't run `tidyLines` on `onNodeDragStop` (or highlight change) at all by default. Options: make obstacle routing strictly the manual "Tidy Lines" button; or move it to a Web Worker / `requestIdleCallback` with cancellation so it never blocks the main thread; or only re-route the handful of edges touching the moved card, over a *local* grid, not the whole board. Default edges should be the cheap floating elbow (already the live render path) — which needs no A* and already follows cards during drag.

2. **Rewrite/replace the router if kept.** Binary-heap open set, a rasterized obstacle grid (mark blocked cells once, O(1) lookup instead of `some(N)` per cell), and a grid sized to the edge's local corridor with a coarser cell size. Or drop custom A* for a library (e.g. an orthogonal connector router) or simpler heuristics.

3. **Stabilize the edge/node arrays handed to ReactFlow.** Compute `lateralShift`/`isOutgoingFromSelected` without re-cloning every edge each frame (e.g. fold selection-highlight into per-edge state that only changes on selection, memoize `data` by value). Stop rebuilding `rfNodes`/`decoratedEdges` on position-only frames.

4. **Cut per-card subscriptions.** Collapse the ~17 store reads per card into one `useShallow` selector (or pass board-wide modes via context), so a drag frame doesn't fan out thousands of selector calls. Move `activeNode` lookup off the App render path.

5. **Make history cheaper.** Structural sharing (only clone changed nodes) or store inverse-patches instead of full board snapshots.

Item **#1 is ~90% of the felt problem** — fixing the drag-stop A* alone should remove the freeze. #2 makes the actual dragging/panning smooth. #3–5 are for true 150–200-card headroom.
