import { describe, expect, it } from 'vitest'

import { computeTagLogos } from './tagLogos'

describe('computeTagLogos', () => {
  it('uses the first letter when tags do not collide', () => {
    const logos = computeTagLogos([
      { id: 's', name: 'Suspect' },
      { id: 'l', name: 'Location' }
    ])
    expect(logos.get('s')).toBe('S')
    expect(logos.get('l')).toBe('L')
  })

  it('extends to two letters when first letters collide', () => {
    const logos = computeTagLogos([
      { id: 'su', name: 'Suspect' },
      { id: 'sc', name: 'Scene' }
    ])
    expect(logos.get('su')).toBe('SU')
    expect(logos.get('sc')).toBe('SC')
  })

  it('extends until the prefix is unique (Star vs Stage share STA, so both grow to 4)', () => {
    const logos = computeTagLogos([
      { id: 'a', name: 'Star' },
      { id: 'b', name: 'Stage' }
    ])
    expect(logos.get('a')).toBe('STAR')
    expect(logos.get('b')).toBe('STAG')
  })

  it('falls back to the whole word when one tag is a prefix of another', () => {
    const logos = computeTagLogos([
      { id: 'a', name: 'Cat' },
      { id: 'b', name: 'Cats' }
    ])
    // "cat" is fully contained in "cats", so Cat can never be unique; it uses its full length.
    expect(logos.get('a')).toBe('CAT')
    expect(logos.get('b')).toBe('CATS')
  })

  it('is case-insensitive for collisions but renders uppercase', () => {
    const logos = computeTagLogos([
      { id: 'a', name: 'alpha' },
      { id: 'b', name: 'Apex' }
    ])
    expect(logos.get('a')).toBe('AL')
    expect(logos.get('b')).toBe('AP')
  })
})
