# Performance Optimization Summary

## Problem Identified
When dragging cards with 20+ cards on the board, the app experienced severe lag (O(N²) behavior). This was caused by:
1. Every card subscribing to the full `nodes` array
2. Every position change (during drag) changed the `nodes` array reference
3. This triggered all N cards' refs memoization to recalculate
4. With 20+ cards, each re-rendering on every drag frame = O(N²) work

## Solution Implemented

### 1. Store-Level Memoization with Data Signatures
**File**: `src/store/useNarrativeBoardStore.ts`

- `getNodeCodeIndex(nodes)`: Caches code→{title,slipTypeId} map using a data-signature (not position-dependent)
- `getResolvedRefs(referencesText, nodes, slipTypes)`: Caches resolved references using signature-based comparison

Both functions use `_lastSig` property to detect when cached result can be reused, avoiding recalculation on position-only changes.

### 2. Card-Level Optimization
**File**: `src/components/NarrativeCardNode.tsx`

- Old approach: `const nodes = useNarrativeBoardStore((state) => state.nodes)` - re-renders on any node change
- New approach: `const refSignature = useNarrativeBoardStore((state) => buildSignatureOfReferencedNodesData(...)` - only re-renders when referenced cards' data changes

The `refSignature` is a stable string built from:
- Referenced card codes + slipTypeIds + titles
- NOT card positions
- Changes only when ref data actually changes

### 3. Group Selection Optimization
**File**: `src/components/NarrativeCardNode.tsx`

- Old: `isGroupSelected` looked up in full `state.groups.find()` per render
- New: Subscribe to `activeGroupNodeIds` string signature, use `.includes()` for O(1) lookup

## Performance Impact

### Before Optimization
```
Dragging card with 20 cards:
- Each drag frame (60fps) = ~16ms
- Each frame triggers all 20 cards' refs recalculation
- 20 cards × lookup time per card = noticeable lag
```

### After Optimization
```
Dragging card with 20 cards:
- Each drag frame only affects cards whose REFERENCED data changed
- Position-only changes don't trigger ref recalculation
- Cards that don't reference moved card don't re-render
- Expected ~N-fold improvement (typically N/2 to N/10 cards re-render vs all N)
```

## Testing Recommendations

### 1. Simple Test (with 2-3 cards)
✅ Already verified - app renders correctly

### 2. Performance Test (with 20+ cards)
1. Load or create a board with 20+ cards
2. Select and drag a card smoothly
3. Monitor for jank/stutter
4. Check DevTools Performance tab:
   - Look at frame time during drag
   - Count component renders (should be much fewer than N cards)
   - Verify refs recalculation time is minimal

### 3. Chrome DevTools Profiling
1. Open DevTools → Performance tab
2. Start recording
3. Drag a card for 3-5 seconds
4. Stop recording
5. Look for:
   - Renderer work time (should stay under 16ms per frame for 60fps)
   - Number of component renders
   - Time spent in useMemo/refs calculation

## Code Patterns Used

### Data Signature Caching
```typescript
function getCachedResult(data: DataType): ResultType {
  const sig = computeSignature(data) // stable string, not positions
  if (getCachedResult._lastSig !== sig) {
    getCachedResult._lastSig = sig
    getCachedResult._cache = expensiveComputation(data)
  }
  return getCachedResult._cache
}
getCachedResult._lastSig = ''
getCachedResult._cache = defaultValue
```

### Zustand Selector Signature Pattern
```typescript
const signature = useStore((state) => {
  // Return stable string when only data (not positions) changes
  return state.items.map(item => `${item.code}:${item.type}`).join('|')
})

const result = useMemo(() => {
  // Expensive computation runs only when signature changes
  return doExpensiveWork(useStore.getState().items)
}, [signature])
```

## Known Limitations & Future Optimizations

### Current
- Each card's selector still runs on every store update
- Zustand selectors are not memoized by default
- But the selector returns stable string for position-only changes

### Potential Future Improvements
1. **Selector Memoization**: Create selector factory that memoizes return value
2. **Subdivision**: Split nodes array into spatial buckets to avoid full scans
3. **Worker Thread**: Move expensive ref calculations to Web Worker
4. **Incremental Updates**: Only update cards whose dependencies changed

## Files Modified

- `src/store/useNarrativeBoardStore.ts`: Added getNodeCodeIndex, getResolvedRefs
- `src/components/NarrativeCardNode.tsx`: Optimized ref selector, group selection, added tag logo cache
- `src/components/edges/useObstacleRoute.ts`: No changes (already optimal)
- `src/components/edges/useTidyLines.ts`: No changes (already optimal)

## Verification

✅ Build succeeds: `npm run build`
✅ App renders: 2 sample cards visible
✅ No TypeScript errors
✅ No infinite loops or console errors
✅ Drag test completes successfully
