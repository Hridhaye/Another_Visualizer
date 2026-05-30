import { createContext } from 'react'

/**
 * Resolved reference data for one referenced card code.
 */
export type CodeEntry = { title: string; slipColor: string }

/**
 * A `code -> {title, slipColor}` lookup for resolving a card's referencesText
 * into ref chips, shared via context so each card does an O(1) lookup instead
 * of scanning the whole nodes array.
 *
 * The map is rebuilt by the provider only when card content (codes, titles,
 * slip types) or the palette changes — never on drag/pan/select — so consuming
 * cards re-render for refs only when a referenced card's display data actually
 * changes, not on every board interaction.
 */
export const CardCodeIndexContext = createContext<Map<string, CodeEntry>>(new Map())
