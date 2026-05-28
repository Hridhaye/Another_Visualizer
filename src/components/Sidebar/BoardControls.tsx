import { useRef, useState, type ChangeEvent } from 'react'

import { exportAIFormat } from '../../ai/exportAIFormat'
import type { NarrativeNode, SlipType } from '../../types/narrative'

type BoardControlsProps = {
  nodes: NarrativeNode[]
  slipTypes: SlipType[]
  projectName: string
  updatedAt: string
  hasUnsavedChanges: boolean
  onAddCard: () => void
  onSaveProject: () => Promise<void>
  onLoadProject: (file: File) => Promise<void>
  onImportAIFormat: (text: string) => Promise<{ createdCount: number; updatedCount: number }>
  onProjectNameChange: (value: string) => void
}

export function BoardControls({
  nodes,
  slipTypes,
  projectName,
  updatedAt,
  hasUnsavedChanges,
  onAddCard,
  onSaveProject,
  onLoadProject,
  onImportAIFormat,
  onProjectNameChange
}: BoardControlsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [showAIImportModal, setShowAIImportModal] = useState(false)
  const [importText, setImportText] = useState('')
  const [feedback, setFeedback] = useState('')

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

  const handleCopyAIFormat = async () => {
    try {
      const text = exportAIFormat(nodes, slipTypes)
      await navigator.clipboard.writeText(text)
      setFeedback('AI format copied to clipboard.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to copy the AI format.'
      window.alert(message)
    }
  }

  const handleImportAIFormat = async () => {
    const trimmed = importText.trim()
    if (!trimmed) {
      window.alert('Paste the AI format text before importing.')
      return
    }

    try {
      const result = await onImportAIFormat(trimmed)
      setFeedback(`Imported ${result.updatedCount} updated and ${result.createdCount} created card(s).`)
      setShowAIImportModal(false)
      setImportText('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to import the AI format.'
      window.alert(message)
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
        onClick={handleCopyAIFormat}
        className="mt-3 w-full rounded-lg bg-violet-700 px-4 py-2.5 text-base font-semibold transition-colors hover:bg-violet-600"
      >
        Copy AI Format
      </button>

      <button
        onClick={() => setShowAIImportModal(true)}
        className="mt-3 w-full rounded-lg bg-amber-700 px-4 py-2.5 text-base font-semibold transition-colors hover:bg-amber-600"
      >
        Import AI Format
      </button>

      <button
        onClick={handleLoadClick}
        className="mt-3 w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-base font-semibold transition-colors hover:bg-emerald-600"
      >
        Import Project
      </button>

      {feedback ? <p className="mt-3 text-xs text-emerald-300">{feedback}</p> : null}

      {showAIImportModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl shadow-black/40">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">Import AI Format</h3>
                <p className="text-xs text-zinc-400">Paste the DSL text. Existing codes are updated; missing codes are created.</p>
              </div>
              <button onClick={() => setShowAIImportModal(false)} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200">Close</button>
            </div>
            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              rows={14}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-100 outline-none focus:border-violet-500"
              placeholder="@CARD AA01\nTITLE: Forest Arrival\n..."
            />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setShowAIImportModal(false)} className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-200">Cancel</button>
              <button onClick={handleImportAIFormat} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">Import</button>
            </div>
          </div>
        </div>
      ) : null}

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
