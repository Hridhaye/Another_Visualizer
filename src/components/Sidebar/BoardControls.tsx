import { useRef, useState, type ChangeEvent } from 'react'

import { exportAIFormat } from '../../ai/exportAIFormat'
import { useNarrativeBoardStore } from '../../store/useNarrativeBoardStore'
import type { NarrativeNode, SlipType } from '../../types/narrative'


type BoardControlsProps = {
  nodes: NarrativeNode[]
  slipTypes: SlipType[]
  projectName: string
  updatedAt: string
  hasUnsavedChanges: boolean
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
  onSaveProject,
  onLoadProject,
  onImportAIFormat,
  onProjectNameChange
}: BoardControlsProps) {
  const selectedNodeIds = useNarrativeBoardStore((state) => state.selectedNodeIds)
  const groups = useNarrativeBoardStore((state) => state.groups)
  const selectGroup = useNarrativeBoardStore((state) => state.selectGroup)
  const deleteGroup = useNarrativeBoardStore((state) => state.deleteGroup)
  const highlightedNodeIds = useNarrativeBoardStore((state) => state.highlightedNodeIds)
  const setHighlight = useNarrativeBoardStore((state) => state.setHighlight)
  const clearHighlight = useNarrativeBoardStore((state) => state.clearHighlight)
  const activeGroupId = useNarrativeBoardStore((state) => state.activeGroupId)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [showAIImportModal, setShowAIImportModal] = useState(false)
  const [importText, setImportText] = useState('')
  const [feedback, setFeedback] = useState('')

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      await onLoadProject(file)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to load project file.')
    } finally {
      event.target.value = ''
    }
  }

  const handleCopyDSL = async () => {
    try {
      const nodesToExport =
        selectedNodeIds.length > 1
          ? nodes.filter((node) => selectedNodeIds.includes(node.id))
          : nodes
      const text = exportAIFormat(nodesToExport, slipTypes)
      await navigator.clipboard.writeText(text)
      setFeedback(
        selectedNodeIds.length > 1
          ? `Copied ${nodesToExport.length} selected cards.`
          : 'Copied to clipboard.'
      )
      setTimeout(() => setFeedback(''), 2500)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to copy.')
    }
  }

  const handleImportDSL = async () => {
    const trimmed = importText.trim()
    if (!trimmed) {
      window.alert('Paste DSL text before importing.')
      return
    }
    try {
      const result = await onImportAIFormat(trimmed)
      setFeedback(`${result.createdCount} created, ${result.updatedCount} updated.`)
      setShowAIImportModal(false)
      setImportText('')
      setTimeout(() => setFeedback(''), 3000)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to import.')
    }
  }

  const formattedDate = updatedAt
    ? new Date(updatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : '-'

  return (
    <div className="sidebar-panel">
      <div className="sidebar-project-block">
        <input
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          className="sidebar-input"
          placeholder="Project name"
        />
        <div className="sidebar-meta-row">
          <span className={hasUnsavedChanges ? 'sidebar-meta sidebar-meta--warn' : 'sidebar-meta sidebar-meta--ok'}>
            {hasUnsavedChanges ? 'Unsaved' : 'Saved'}
          </span>
          <span className="sidebar-meta">{formattedDate}</span>
        </div>
      </div>

      <div className="sidebar-grid-two">
        <button
          onClick={async () => {
            try {
              await onSaveProject()
            } catch (error) {
              window.alert(error instanceof Error ? error.message : 'Export failed.')
            }
          }}
          className="sidebar-btn"
        >
          Export
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="sidebar-btn">Import</button>
      </div>

      <div className="sidebar-grid-two">
        <button onClick={handleCopyDSL} className="sidebar-btn sidebar-btn--violet">Copy DSL</button>
        <button onClick={() => setShowAIImportModal(true)} className="sidebar-btn sidebar-btn--amber">Import DSL</button>
      </div>

      {feedback && <p className="sidebar-feedback">{feedback}</p>}

      <div className="group-picker">
        <div className="group-picker__header">
          <span className="sidebar-label">Groups</span>
          <span className="group-picker__count">{groups.length}</span>
        </div>
        {groups.length === 0 ? (
          <p className="group-picker__empty">Create groups from a multi-card selection.</p>
        ) : (
          <div className="group-picker__list">
            {groups.map((group) => {
              const isActive = activeGroupId === group.id
              const isHighlighted = group.nodeIds.length > 0 && group.nodeIds.every((id) => highlightedNodeIds.includes(id))
              return (
                <div key={group.id} className="group-picker__item">
                  <button
                    onClick={() => selectGroup(group.id)}
                    className={`group-picker__select${isActive ? ' group-picker__select--flash' : ''}`}
                  >
                    <span className="group-picker__name">{group.name}</span>
                    <span className="group-picker__meta">
                      {isActive ? `✓ ${group.nodeIds.length} selected` : `${group.nodeIds.length} cards`}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (isHighlighted) {
                        clearHighlight()
                      } else {
                        setHighlight(group.nodeIds)
                      }
                    }}
                    className={`group-picker__highlight${isHighlighted ? ' group-picker__highlight--on' : ''}`}
                    aria-label={isHighlighted ? `Clear highlight` : `Highlight ${group.name}`}
                    title={isHighlighted ? 'Clear highlight' : 'Highlight cards'}
                  >
                    ◉
                  </button>
                  <button
                    onClick={() => deleteGroup(group.id)}
                    className="group-picker__delete"
                    aria-label={`Delete ${group.name} group`}
                  >
                    x
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showAIImportModal && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">Import DSL</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Paste DSL text. Existing codes are updated; new codes are created.</p>
              </div>
              <button onClick={() => setShowAIImportModal(false)} className="rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200">Close</button>
            </div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={12}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 font-mono text-xs text-zinc-200 outline-none focus:border-violet-500"
              placeholder="@CARD AA01&#10;TITLE: Forest Arrival&#10;..."
            />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setShowAIImportModal(false)} className="rounded bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700">Cancel</button>
              <button onClick={handleImportDSL} className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600">Import</button>
            </div>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileChange} />
    </div>
  )
}
