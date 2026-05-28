const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function generateNextCode(existingCodes: string[]): string {
  const index = existingCodes.length
  const first = LETTERS[Math.floor(index / (26 * 99)) % 26]
  const second = LETTERS[Math.floor(index / 99) % 26]
  const number = (index % 99) + 1

  return first + second + String(number).padStart(2, '0')
}
