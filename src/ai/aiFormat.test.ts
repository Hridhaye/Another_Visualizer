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
          slipGivenTypeIds: [],
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
          slipGivenTypeIds: [],
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
    expect(text).toContain('CARD_SLIP: Red Slip')
    expect(text).toContain('CARD_SLIP: Blue Slip')
  })

  it('exports SLIP_GIVEN with ×N for duplicates', () => {
    const text = exportAIFormat([
      {
        id: 'a',
        data: {
          code: 'AA01',
          title: 'First',
          summary: '',
          body: '',
          slipTypeId: 'blue',
          slipGivenTypeIds: ['red', 'red', 'green'],
          referencesText: '',
          puzzleType: 'none'
        }
      }
    ] as never, [
      { id: 'blue', name: 'Blue Slip', color: '#3b82f6' },
      { id: 'red', name: 'Red Slip', color: '#ef4444' },
      { id: 'green', name: 'Green Slip', color: '#22c55e' }
    ])

    expect(text).toContain('SLIP_GIVEN: Red Slip ×2, Green Slip')
  })

  it('exports puzzle type plus summary text for visual indicators', () => {
    const text = exportAIFormat([
      {
        id: 'a',
        data: {
          code: 'AA01',
          title: 'First',
          summary: '',
          body: '',
          slipTypeId: 'blue',
          slipGivenTypeIds: [],
          referencesText: '',
          puzzleType: 'matching',
          puzzleSummary: 'Who left the door closed that night?'
        }
      }
    ] as never, [])

    expect(text).toContain('PUZZLE: Matching: Who left the door closed that night?')
  })

  it('parses CARD_SLIP and SLIP_GIVEN with ×N count', () => {
    const raw = `
@CARD AA01
TITLE: Forest Arrival
CARD_SLIP: Blue Slip
SLIP_GIVEN: Red Slip ×2, Green Slip
PUZZLE: none

SUMMARY:
The protagonist reaches the remote town.

REFERENCES:
- AA02
`

    const blocks = parseAIBlocks(raw)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]?.slip).toBe('Blue Slip')
    expect(blocks[0]?.slipGiven).toEqual(['Red Slip', 'Red Slip', 'Green Slip'])
  })

  it('parses legacy SLIP: field as card slip', () => {
    const raw = `
@CARD AA01
TITLE: Forest Arrival
SLIP: Blue Slip
`
    const blocks = parseAIBlocks(raw)
    expect(blocks[0]?.slip).toBe('Blue Slip')
  })

  it('parses and validates partial AI blocks with multiline content', () => {
    const raw = `
@CARD AA01
TITLE: Forest Arrival
CARD_SLIP: Blue Slip
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
      { id: 'existing', data: { code: 'AA01', title: 'Old', summary: '', body: '', slipTypeId: 'blue', slipGivenTypeIds: [], referencesText: '', puzzleType: 'none' } }
    ] as never)

    expect(blocks).toHaveLength(1)
    expect(validation.ok).toBe(true)
    if (validation.ok) {
      expect(validation.cards[0]?.title).toBe('Forest Arrival')
      expect(validation.cards[0]?.content).toContain('Line one.')
    }
  })
})
