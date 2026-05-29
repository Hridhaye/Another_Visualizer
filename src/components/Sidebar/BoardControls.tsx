import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { User } from 'firebase/auth'

import { exportAIFormat, type ExportMode } from '../../ai/exportAIFormat'
import { signInWithGoogle, signOut } from '../../firebase/auth'
import { useNarrativeBoardStore } from '../../store/useNarrativeBoardStore'
import type { NarrativeNode, SlipType } from '../../types/narrative'
import { PUZZLE_TYPES } from '../../types/narrative'


type BoardControlsProps = {
  nodes: NarrativeNode[]
  slipTypes: SlipType[]
  projectName: string
  updatedAt: string
  hasUnsavedChanges: boolean
  onImportAIFormat: (text: string) => Promise<{ createdCount: number; updatedCount: number }>
  onProjectNameChange: (value: string) => void
  currentUser: User | null
  authLoading: boolean
  onCloudSave: () => Promise<void>
  onCloudLoad: () => Promise<void>
  cloudSaveLoading: boolean
  cloudLoadLoading: boolean
  lastCloudSyncAt: Date | null
}

export function BoardControls({
  nodes,
  slipTypes,
  projectName,
  updatedAt,
  hasUnsavedChanges,
  onImportAIFormat,
  onProjectNameChange,
  currentUser,
  authLoading,
  onCloudSave,
  onCloudLoad,
  cloudSaveLoading,
  cloudLoadLoading,
  lastCloudSyncAt,
}: BoardControlsProps) {
  const selectedNodeIds = useNarrativeBoardStore((state) => state.selectedNodeIds)
  const tags = useNarrativeBoardStore((state) => state.tags)
  const groups = useNarrativeBoardStore((state) => state.groups)
  const selectGroup = useNarrativeBoardStore((state) => state.selectGroup)
  const deleteGroup = useNarrativeBoardStore((state) => state.deleteGroup)
  const activeHighlightFilters = useNarrativeBoardStore((state) => state.activeHighlightFilters)
  const toggleHighlightFilter = useNarrativeBoardStore((state) => state.toggleHighlightFilter)
  const clearAllHighlightFilters = useNarrativeBoardStore((state) => state.clearAllHighlightFilters)
  const activeGroupId = useNarrativeBoardStore((state) => state.activeGroupId)
  const [showAIImportModal, setShowAIImportModal] = useState(false)
  const [importText, setImportText] = useState('')
  const [feedback, setFeedback] = useState('')
  const [exportMode, setExportMode] = useState<ExportMode>('standard')

  const handleCopyDSL = async () => {
    try {
      const nodesToExport =
        selectedNodeIds.length > 1
          ? nodes.filter((node) => selectedNodeIds.includes(node.id))
          : nodes
      const text = exportAIFormat(nodesToExport, slipTypes, tags, exportMode)
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
      <div className="sidebar-auth-block">
        {authLoading ? (
          <span className="sidebar-meta">Signing in…</span>
        ) : currentUser ? (
          <div className="sidebar-auth-user">
            {currentUser.photoURL && (
              <img
                src={currentUser.photoURL}
                alt=""
                className="sidebar-auth-avatar"
                referrerPolicy="no-referrer"
              />
            )}
            <span className="sidebar-auth-email">{currentUser.email}</span>
            <button
              onClick={() => signOut().catch((err: Error) => window.alert(err.message))}
              className="sidebar-btn sidebar-auth-signout"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={() => signInWithGoogle().catch((err: Error) => window.alert(err.message))}
            className="sidebar-btn sidebar-btn--google"
          >
            Sign in with Google
          </button>
        )}
      </div>

      {currentUser && (
        <div className="sidebar-grid-two">
          <button
            onClick={async () => {
              try { await onCloudSave() }
              catch (err) { window.alert(err instanceof Error ? err.message : 'Cloud save failed.') }
            }}
            disabled={cloudSaveLoading || cloudLoadLoading}
            className="sidebar-btn sidebar-btn--cloud"
          >
            {cloudSaveLoading ? 'Saving…' : 'Cloud Save'}
          </button>
          <button
            onClick={async () => {
              try { await onCloudLoad() }
              catch (err) { window.alert(err instanceof Error ? err.message : 'Cloud load failed.') }
            }}
            disabled={cloudSaveLoading || cloudLoadLoading}
            className="sidebar-btn sidebar-btn--cloud"
          >
            {cloudLoadLoading ? 'Loading…' : 'Cloud Load'}
          </button>
        </div>
      )}

      {currentUser && lastCloudSyncAt && (
        <span className="sidebar-meta">
          Last synced: {lastCloudSyncAt.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
        </span>
      )}

      {!authLoading && !currentUser && (
        <span className="sidebar-meta sidebar-meta--hint">Sign in to enable cloud save/load</span>
      )}

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

      <div className="dsl-export">
        <div className="dsl-export__modes">
          {(['standard', 'narrative', 'narrative-puzzle'] as ExportMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setExportMode(mode)}
              className={`dsl-export__mode${exportMode === mode ? ' dsl-export__mode--active' : ''}`}
            >
              {mode === 'standard' ? 'Standard' : mode === 'narrative' ? 'Narrative' : '+ Puzzle'}
            </button>
          ))}
        </div>
        <div className="dsl-export__actions">
          <button onClick={handleCopyDSL} className="sidebar-btn sidebar-btn--violet">Copy DSL</button>
          <button onClick={() => setShowAIImportModal(true)} className="sidebar-btn sidebar-btn--amber">Import DSL</button>
        </div>
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
              const isHighlighted = activeHighlightFilters.some((f) => f.type === 'group' && f.id === group.id)
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
                    onClick={() => toggleHighlightFilter({ type: 'group', id: group.id })}
                    className={`group-picker__highlight${isHighlighted ? ' group-picker__highlight--on' : ''}`}
                    aria-label={isHighlighted ? `Remove highlight` : `Highlight ${group.name}`}
                    title={isHighlighted ? 'Remove highlight filter' : 'Highlight cards'}
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

      <div className="group-picker">
        <div className="group-picker__header">
          <span className="sidebar-label">Tags</span>
          <span className="group-picker__count">{tags.length}</span>
        </div>
        {tags.length === 0 ? (
          <p className="group-picker__empty">No tags defined yet.</p>
        ) : (
          <div className="group-picker__list">
            {tags.map((tag) => {
              const isHighlighted = activeHighlightFilters.some((f) => f.type === 'tag' && f.id === tag.id)
              const count = nodes.filter((n) => (n.data.tagIds ?? []).includes(tag.id)).length
              return (
                <div key={tag.id} className="group-picker__item highlight-filter__item">
                  <button className="group-picker__select">
                    <span className="group-picker__name">{tag.name}</span>
                    <span className="group-picker__meta">{count} card{count !== 1 ? 's' : ''}</span>
                  </button>
                  <button
                    onClick={() => toggleHighlightFilter({ type: 'tag', id: tag.id })}
                    className={`group-picker__highlight${isHighlighted ? ' group-picker__highlight--on' : ''}`}
                    aria-label={isHighlighted ? `Remove highlight` : `Highlight tag ${tag.name}`}
                    title={isHighlighted ? 'Remove highlight filter' : 'Highlight cards with this tag'}
                  >
                    ◉
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="group-picker">
        <div className="group-picker__header">
          <span className="sidebar-label">Puzzle Types</span>
        </div>
        <div className="group-picker__list">
          {PUZZLE_TYPES.filter((pt) => pt !== 'none').map((pt) => {
            const isHighlighted = activeHighlightFilters.some((f) => f.type === 'puzzleType' && f.id === pt)
            const count = nodes.filter((n) => n.data.puzzleType === pt).length
            const label = pt.charAt(0).toUpperCase() + pt.slice(1)
            return (
              <div key={pt} className="group-picker__item highlight-filter__item">
                <button className="group-picker__select">
                  <span className="group-picker__name">{label}</span>
                  <span className="group-picker__meta">{count} card{count !== 1 ? 's' : ''}</span>
                </button>
                <button
                  onClick={() => toggleHighlightFilter({ type: 'puzzleType', id: pt })}
                  className={`group-picker__highlight${isHighlighted ? ' group-picker__highlight--on' : ''}`}
                  aria-label={isHighlighted ? `Remove highlight` : `Highlight ${label} puzzles`}
                  title={isHighlighted ? 'Remove highlight filter' : `Highlight ${label} puzzle cards`}
                >
                  ◉
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {activeHighlightFilters.length > 0 && (
        <button
          onClick={clearAllHighlightFilters}
          className="sidebar-btn highlight-filter__clear"
        >
          Clear all highlights ({activeHighlightFilters.length})
        </button>
      )}

      {showAIImportModal && createPortal(
        <div className="dsl-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowAIImportModal(false) }}>
          <div className="dsl-modal">
            <div className="dsl-modal__header">
              <div>
                <p className="dsl-modal__title">Import DSL</p>
                <p className="dsl-modal__subtitle">Paste DSL text. Existing codes are updated; new codes are created.</p>
              </div>
              <button onClick={() => setShowAIImportModal(false)} className="dsl-modal__close">Close</button>
            </div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={12}
              className="dsl-modal__textarea"
              placeholder={"@CARD AA01\nTITLE: Forest Arrival\nCARD_SLIP: Blue Slip\nSLIP_GIVEN: Red Slip ×2, Green Slip\n..."}
            />
            <div className="dsl-modal__footer">
              <button onClick={() => setShowAIImportModal(false)} className="dsl-modal__btn-cancel">Cancel</button>
              <button onClick={handleImportDSL} className="dsl-modal__btn-import">Import</button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  )
}
