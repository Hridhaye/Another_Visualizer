import { validateProject } from './validateProject'

export function deserializeProject(rawText: string) {
  try {
    const parsed = JSON.parse(rawText) as unknown
    const validation = validateProject(parsed)

    if (!validation.ok) {
      throw new Error(validation.error)
    }

    return validation.project
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message, { cause: error })
    }

    throw new Error('The selected file could not be read as a valid project export.', { cause: error })
  }
}
