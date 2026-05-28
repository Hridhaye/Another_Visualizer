import type { Tag } from '../types/narrative'

/**
 * Computes a short "logo" string for each tag: normally the first letter, but
 * extended to the minimal prefix that is unique among all project tags. If two
 * tags share a first letter, both grow to two letters; if those collide too,
 * three; and so on. Comparison is case-insensitive; logos render uppercased.
 */
export function computeTagLogos(tags: Tag[]): Map<string, string> {
  const logos = new Map<string, string>()
  const names = tags.map((tag) => ({ tag, key: tag.name.trim().toLowerCase() }))

  for (const { tag, key } of names) {
    if (!key) {
      logos.set(tag.id, '?')
      continue
    }

    let length = 1
    while (length < key.length) {
      const prefix = key.slice(0, length)
      const collides = names.some(
        (other) => other.tag.id !== tag.id && other.key.slice(0, length) === prefix
      )
      if (!collides) break
      length += 1
    }

    logos.set(tag.id, key.slice(0, length).toUpperCase())
  }

  return logos
}
