import { useRef, type ChangeEvent } from 'react'

type BoardControlsProps = {
  projectName: string
  updatedAt: string
  hasUnsavedChanges: boolean
  onAddCard: () => void
  onSaveProject: () => Promise<void>
  onLoadProject: (file: File) => Promise<void>
  onProjectNameChange: (value: string) => void
}

export function BoardControls({
  projectName,
  updatedAt,
  hasUnsavedChanges,
  onAddCard,
  onSaveProject,
  onLoadProject,
  onProjectNameChange
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

  const formattedUpdatedAt = updatedAt
    ? new Date(updatedAt).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : 'Not saved yet'

  return (
    <div className="px-4 pb-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 text-sm text-zinc-200">
        <label className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-zinc-400">Project name</label>
        <input
          value={projectName}
          onChange={(event) => onProjectNameChange(event.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-0 transition focus:border-blue-500"
          placeholder="Mystery Board"
        />

        <div className="mt-3 flex items-center justify-between text-xs text-zinc-300">
          <span className={hasUnsavedChanges ? 'text-amber-300' : 'text-emerald-300'}>
            {hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'}
          </span>
          <span className="text-zinc-400">Last saved: {formattedUpdatedAt}</span>
        </div>
      </div>

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
            const message = error instanceof Error ? error.message : 'Unable to export the project.'
            window.alert(message)
          }
        }}
        className="mt-3 w-full rounded-lg bg-zinc-700 px-4 py-2.5 text-base font-semibold transition-colors hover:bg-zinc-600"
      >
        Export Project
      </button>

      <button
        onClick={handleLoadClick}
        className="mt-3 w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-base font-semibold transition-colors hover:bg-emerald-600"
      >
        Import Project
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
