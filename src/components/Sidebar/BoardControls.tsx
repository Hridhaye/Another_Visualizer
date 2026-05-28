import { useRef, type ChangeEvent } from 'react'

type BoardControlsProps = {
  onAddCard: () => void
  onSaveProject: () => Promise<void>
  onLoadProject: (file: File) => Promise<void>
}

export function BoardControls({
  onAddCard,
  onSaveProject,
  onLoadProject
}: BoardControlsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleLoadClick = async () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      await onLoadProject(file)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load the selected project file.'
      window.alert(message)
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="px-4 pb-4">
      <button
        onClick={onAddCard}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-base font-semibold transition-colors hover:bg-blue-500"
      >
        Add Card
      </button>

      <button
        onClick={async () => {
          try {
            await onSaveProject()
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to save the project.'
            window.alert(message)
          }
        }}
        className="mt-3 w-full rounded-lg bg-zinc-700 px-4 py-2.5 text-base font-semibold transition-colors hover:bg-zinc-600"
      >
        Save Project
      </button>

      <button
        onClick={handleLoadClick}
        className="mt-3 w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-base font-semibold transition-colors hover:bg-emerald-600"
      >
        Load Project
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
