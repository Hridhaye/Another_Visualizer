import { describe, expect, it } from 'vitest'

import { exportAIFormat } from './exportAIFormat'
import { importAIFormat } from './importAIFormat'
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

  it('roundtrips Slip Given totals (auto-slips export as the stored total)', () => {
    const slipTypes = [
      { id: 'blue', name: 'Blue Slip', color: '#3b82f6' },
      { id: 'red', name: 'Red Slip', color: '#ef4444' }
    ]
    // BB02 references AA01 (red) with its slip form on, so the red slip is part
    // of BB02's stored Slip Given total.
    const nodes = [
      { id: 'a', type: 'narrativeCard', position: { x: 0, y: 0 }, data: { code: 'AA01', title: 'First', summary: '', body: '', slipTypeId: 'red', slipGivenTypeIds: [], referencesText: '', referenceSlipForms: [], puzzleType: 'none' } },
      { id: 'b', type: 'narrativeCard', position: { x: 0, y: 0 }, data: { code: 'BB02', title: 'Second', summary: '', body: '', slipTypeId: 'blue', slipGivenTypeIds: ['red'], referencesText: 'AA01', referenceSlipForms: ['AA01'], puzzleType: 'none' } }
    ] as never

    const text = exportAIFormat(nodes, slipTypes)
    expect(text).toContain('SLIP_GIVEN: Red Slip')

    const result = importAIFormat(text, nodes, slipTypes)
    const reimportedB = result.updatedNodes.find((n) => n.data.code === 'BB02')
    expect(reimportedB?.data.slipGivenTypeIds).toEqual(['red'])
  })

  it('tops Slip Given up to the reference minimum when the DSL omits it', () => {
    const slipTypes = [{ id: 'red', name: 'Red Slip', color: '#ef4444' }]
    const nodes = [
      { id: 'a', type: 'narrativeCard', position: { x: 0, y: 0 }, data: { code: 'AA01', title: 'First', summary: '', body: '', slipTypeId: 'red', slipGivenTypeIds: [], referencesText: '', referenceSlipForms: [], puzzleType: 'none' } },
      { id: 'b', type: 'narrativeCard', position: { x: 0, y: 0 }, data: { code: 'BB02', title: 'Second', summary: '', body: '', slipTypeId: 'red', slipGivenTypeIds: ['red'], referencesText: 'AA01', referenceSlipForms: ['AA01'], puzzleType: 'none' } }
    ] as never

    // Hand-edited DSL that drops BB02's SLIP_GIVEN entirely.
    const raw = `@CARD AA01\nTITLE: First\nCARD_SLIP: Red Slip\n\n@CARD BB02\nTITLE: Second\nCARD_SLIP: Red Slip\n\nREFERENCES:\n- AA01\n`
    const result = importAIFormat(raw, nodes, slipTypes)
    const reimportedB = result.updatedNodes.find((n) => n.data.code === 'BB02')
    // referenceSlipForms still has AA01 (red) on, so the minimum of 1 red is restored.
    expect(reimportedB?.data.slipGivenTypeIds).toEqual(['red'])
  })

  it('exports and re-imports TAGS, resolving names back to the same tag ids', () => {
    const tags = [
      { id: 't-suspect', name: 'Suspect' },
      { id: 't-location', name: 'Location' }
    ]
    const nodes = [
      { id: 'a', type: 'narrativeCard', position: { x: 0, y: 0 }, data: { code: 'AA01', title: 'First', summary: '', body: '', slipTypeId: 'blue', slipGivenTypeIds: [], referencesText: '', referenceSlipForms: [], tagIds: ['t-suspect', 't-location'], puzzleType: 'none' } }
    ] as never

    const text = exportAIFormat(nodes, [{ id: 'blue', name: 'Blue Slip', color: '#3b82f6' }], tags)
    expect(text).toContain('TAGS: Suspect, Location')

    const result = importAIFormat(text, nodes, [{ id: 'blue', name: 'Blue Slip', color: '#3b82f6' }], tags)
    const reimported = result.updatedNodes.find((n) => n.data.code === 'AA01')
    expect(reimported?.data.tagIds).toEqual(['t-suspect', 't-location'])
    expect(result.updatedTags).toHaveLength(2)
  })

  it('creates new tags on import when the TAGS name is unknown', () => {
    const nodes = [
      { id: 'a', type: 'narrativeCard', position: { x: 0, y: 0 }, data: { code: 'AA01', title: 'First', summary: '', body: '', slipTypeId: 'blue', slipGivenTypeIds: [], referencesText: '', referenceSlipForms: [], tagIds: [], puzzleType: 'none' } }
    ] as never

    const raw = `@CARD AA01\nTITLE: First\nTAGS: Clue, Witness\n`
    const result = importAIFormat(raw, nodes, [{ id: 'blue', name: 'Blue Slip', color: '#3b82f6' }], [])
    expect(result.updatedTags.map((t) => t.name).sort()).toEqual(['Clue', 'Witness'])
    const reimported = result.updatedNodes.find((n) => n.data.code === 'AA01')
    expect(reimported?.data.tagIds).toHaveLength(2)
  })

  it('exports only the selected elements', () => {
    const nodes = [
      { id: 'a', type: 'narrativeCard', position: { x: 0, y: 0 }, data: { code: 'AA01', title: 'First', summary: 'A summary', body: 'A body', slipTypeId: 'blue', slipGivenTypeIds: [], referencesText: '', tagIds: [], puzzleType: 'none' } },
    ] as never

    const text = exportAIFormat(nodes, [{ id: 'blue', name: 'Blue Slip', color: '#3b82f6' }], [], 'standard', ['title', 'body'])

    expect(text).toContain('TITLE: First')
    expect(text).toContain('BODY:')
    expect(text).toContain('A body')
    // Not selected → absent from both the card block and the helper lines.
    expect(text).not.toContain('CARD_SLIP')
    expect(text).not.toContain('SUMMARY')
  })

  it('imports leniently: missing TITLE and unknown puzzle type do not throw', () => {
    const slipTypes = [{ id: 'blue', name: 'Blue Slip', color: '#3b82f6' }]
    // ZZ99 has no title and a bogus puzzle type — both must be tolerated.
    const raw = `@CARD ZZ99\nPUZZLE: wizardry: nonsense\nBODY:\nrough notes here\nEND_BODY\n`

    const result = importAIFormat(raw, [], slipTypes)
    const created = result.updatedNodes.find((n) => n.data.code === 'ZZ99')
    expect(created).toBeTruthy()
    expect(created?.data.title).toBe('')
    expect(created?.data.puzzleType).toBe('none')
    expect(created?.data.body).toContain('rough notes here')
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
