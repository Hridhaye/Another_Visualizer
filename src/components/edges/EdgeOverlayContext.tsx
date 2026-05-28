import { createContext, useContext } from 'react'

export const EdgeOverlayContext = createContext<HTMLElement | null>(null)

export function useEdgeOverlay() {
  return useContext(EdgeOverlayContext)
}
