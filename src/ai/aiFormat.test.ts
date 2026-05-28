import { describe, expect, it } from 'vitest'

import { exportAIFormat } from './exportAIFormat'
import { parseAIBlocks } from './parseAIBlocks'
import { validateAIFormat } from './validateAIFormat'

describe('AI narrative DSL', () => {
  it('exports deterministic AI blocks for cards', () => {
    const text = exportAIFormat([
      {
        id: 'b',
        data: {
          code: 'BB02',
          title: 'Second',
          summary: 'Second summary',
          body: 'Body B',
          slipTypeId: 'blue',
          referencesText: 'AA01',
          puzzleType: 'none'
        }
      },
      {
        id: 'a',
        data: {
          code: 'AA01',
          title: 'First',
          summary: 'First summary',
          body: 'Body A',
          slipTypeId: 'red',
          referencesText: '',
          puzzleType: 'matching'
        }
      }
    ] as never, [
      { id: 'blue', name: 'Blue Slip', color: '#3b82f6' },
      { id: 'red', name: 'Red Slip', color: '#ef4444' }
    ])

    expect(text).toContain('@CARD AA01')
    expect(text).toContain('@CARD BB02')
    expect(text.indexOf('@CARD AA01')).toBeLessThan(text.indexOf('@CARD BB02'))
  })

  it('parses and validates partial AI blocks with multiline content', () => {
    const raw = `
@CARD AA01
TITLE: Forest Arrival
SLIP: Blue Slip
PUZZLE: none

SUMMARY:
The protagonist reaches the remote town.

REFERENCES:
- AA02
- CV14

CONTENT:
Line one.
Line two.
END_CONTENT
`

    const blocks = parseAIBlocks(raw)
    const validation = validateAIFormat(blocks, [
      { id: 'existing', data: { code: 'AA01', title: 'Old', summary: '', body: '', slipTypeId: 'blue', referencesText: '', puzzleType: 'none' } }
    ] as never)

    expect(blocks).toHaveLength(1)
    expect(validation.ok).toBe(true)
    if (validation.ok) {
      expect(validation.cards[0]?.title).toBe('Forest Arrival')
      expect(validation.cards[0]?.content).toContain('Line one.')
    }
  })
})
