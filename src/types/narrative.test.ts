import { describe, expect, it } from 'vitest'

import { getPuzzleLabel } from './narrative'

describe('getPuzzleLabel', () => {
  it('formats puzzle types for display', () => {
    expect(getPuzzleLabel('matching')).toBe('Matching')
    expect(getPuzzleLabel('reorder')).toBe('Reorder')
    expect(getPuzzleLabel('fill')).toBe('Fill')
  })

  it('returns a neutral label for no puzzle', () => {
    expect(getPuzzleLabel('none')).toBe('No puzzle')
  })
})
