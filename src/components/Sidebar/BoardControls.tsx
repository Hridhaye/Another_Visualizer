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
    <div className="sidebar-panel flex flex-col gap-2 p-2">
      <div className="sidebar-card rounded-md border border-zinc-800 bg-zinc-900/50 p-2 text-xs">
        <label className="sidebar-label sidebar-label--tight mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Project Name</label>
        <input
          value={projectName}
          onChange={(event) => onProjectNameChange(event.target.value)}
          className="sidebar-input w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-blue-500"
          placeholder="Mystery Board"
        />

        <div className="sidebar-meta-row mt-2 flex items-center justify-between text-[10px]">
          <span className={hasUnsavedChanges ? 'sidebar-meta sidebar-meta--warn text-amber-500/80' : 'sidebar-meta sidebar-meta--ok text-emerald-500/80'}>
            {hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'}
          </span>
          <span className="sidebar-meta text-zinc-600">{formattedUpdatedAt}</span>
        </div>
      </div>

      <button onClick={onAddCard} className="sidebar-btn sidebar-btn--primary w-full rounded-md bg-blue-600 py-1.5 text-xs font-bold text-white hover:bg-blue-500">Add Card</button>

      <div className="sidebar-grid-two grid grid-cols-2 gap-2">
        <button
          onClick={async () => {
            try {
              await onSaveProject()
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unable to export the project.'
              window.alert(message)
            }
          }}
          className="sidebar-btn rounded bg-zinc-800 py-1 text-xs hover:bg-zinc-700"
        >
          Export
        </button>

        <button onClick={handleLoadClick} className="sidebar-btn rounded bg-zinc-800 py-1 text-xs hover:bg-zinc-700">
          Import
        </button>
      </div>

      <div className="sidebar-grid-two grid grid-cols-2 gap-2">
        <button onClick={handleCopyAIFormat} className="sidebar-btn sidebar-btn--violet rounded bg-violet-900/30 border border-violet-800/50 py-1 text-xs text-violet-300 hover:bg-violet-800/40">
          Copy DSL
        </button>

        <button onClick={() => setShowAIImportModal(true)} className="sidebar-btn sidebar-btn--amber rounded bg-amber-900/30 border border-amber-800/50 py-1 text-xs text-amber-300 hover:bg-amber-800/40">
          Import DSL
        </button>
      </div>

      {feedback ? <p className="sidebar-feedback px-1 text-[10px] text-emerald-400/80">{feedback}</p> : null}

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
