import { useNarrativeBoardStore, type EditorField } from '../../store/useNarrativeBoardStore'

type EditorButtonDef = {
  field: EditorField | 'body'
  label: string
  hint: (val: string) => string
}

const EDITOR_BUTTONS: EditorButtonDef[] = [
  { field: 'code', label: 'Code', hint: (value) => value },
  { field: 'title', label: 'Title', hint: (value) => value || '-' },
  { field: 'summary', label: 'Summary', hint: (value) => value ? value.slice(0, 32) + (value.length > 32 ? '...' : '') : '-' },
  { field: 'references', label: 'References', hint: (value) => value || 'none' },
  { field: 'slipType', label: 'Card Slip', hint: () => '' },
  { field: 'slipGiven', label: 'Slip Given', hint: () => '' },
  { field: 'puzzleType', label: 'Puzzle', hint: (value) => value || 'none' },
  { field: 'body', label: 'Narrative Body', hint: () => '' },
]

export function CardEditor() {
  const selectedNodeId = useNarrativeBoardStore((state) => state.selectedNodeId)
  const selectedNodeIds = useNarrativeBoardStore((state) => state.selectedNodeIds)
  const nodes = useNarrativeBoardStore((state) => state.nodes)
  const slipTypes = useNarrativeBoardStore((state) => state.slipTypes)
  const activeEditorField = useNarrativeBoardStore((state) => state.activeEditorField)
  const narrativeBodyOpen = useNarrativeBoardStore((state) => state.narrativeBodyOpen)
  const openEditorField = useNarrativeBoardStore((state) => state.openEditorField)
  const closeEditorField = useNarrativeBoardStore((state) => state.closeEditorField)
  const openNarrativeBody = useNarrativeBoardStore((state) => state.openNarrativeBody)
  const closeNarrativeBody = useNarrativeBoardStore((state) => state.closeNarrativeBody)
  const connectionSourceNodeId = useNarrativeBoardStore((state) => state.connectionSourceNodeId)
  const setConnectionSourceNode = useNarrativeBoardStore((state) => state.setConnectionSourceNode)

  const node = nodes.find((candidate) => candidate.id === selectedNodeId) ?? null
  const hasSingleSelection = selectedNodeIds.length === 1 && !!node
  const hasMultiSelection = selectedNodeIds.length > 1

  function getHint(field: EditorField | 'body'): string {
    if (!node) {
      return ''
    }

    switch (field) {
      case 'code':
        return node.data.code
      case 'title':
        return node.data.title ? node.data.title.slice(0, 28) + (node.data.title.length > 28 ? '...' : '') : '-'
      case 'summary':
        return node.data.summary ? node.data.summary.slice(0, 28) + (node.data.summary.length > 28 ? '...' : '') : '-'
      case 'references':
        return node.data.referencesText || 'none'
      case 'slipType': {
        const slip = slipTypes.find((item) => item.id === node.data.slipTypeId)
        return slip?.name ?? '-'
      }
      case 'slipGiven': {
        const count = (node.data.slipGivenTypeIds ?? []).length
        return count === 0 ? 'none' : `${count} slip${count > 1 ? 's' : ''}`
      }
      case 'puzzleType':
        return node.data.puzzleType || 'none'
      case 'body':
        return node.data.body ? 'has content' : 'empty'
      default:
        return ''
    }
  }

  function getSlipColor(field: EditorField | 'body'): string | null {
    if (field === 'slipType' && node) {
      const slip = slipTypes.find((item) => item.id === node.data.slipTypeId)
      return slip?.color ?? null
    }
    return null
  }

  function isActive(field: EditorField | 'body'): boolean {
    if (field === 'body') {
      return narrativeBodyOpen
    }

    return activeEditorField === field
  }

  function toggle(field: EditorField | 'body') {
    if (!hasSingleSelection) {
      return
    }

    if (field === 'body') {
      narrativeBodyOpen ? closeNarrativeBody() : openNarrativeBody()
      return
    }

    if (activeEditorField === field) {
      closeEditorField()
    } else {
      openEditorField(field)
    }
  }

  const isLinkSource = hasSingleSelection && connectionSourceNodeId === selectedNodeId

  return (
    <div className="card-editor">
      {!hasSingleSelection && !hasMultiSelection && (
        <p className="card-editor__empty-hint">Select a card to edit its fields</p>
      )}
      {hasMultiSelection && (
        <p className="card-editor__empty-hint">
          {selectedNodeIds.length} cards selected. Editing stays single-card; use this state for delete or Copy DSL.
        </p>
      )}
      <div className="card-editor__grid">
        {EDITOR_BUTTONS.map(({ field, label }) => {
          const active = isActive(field)
          const hint = getHint(field)
          const slipColor = getSlipColor(field)
          const isBody = field === 'body'

          return (
            <button
              key={field}
              disabled={!hasSingleSelection}
              onClick={() => toggle(field)}
              className={[
                'card-editor__btn',
                active ? 'card-editor__btn--active' : '',
                !hasSingleSelection ? 'card-editor__btn--disabled' : '',
                isBody ? 'card-editor__btn--body' : '',
              ].filter(Boolean).join(' ')}
            >
              <span className="card-editor__btn-label">{label}</span>
              {hasSingleSelection && hint && (
                <span className="card-editor__btn-hint">
                  {slipColor && (
                    <span
                      className="card-editor__slip-dot"
                      style={{ background: slipColor }}
                    />
                  )}
                  {hint}
                </span>
              )}
            </button>
          )
        })}

        <button
          disabled={!hasSingleSelection}
          onClick={() => {
            if (!hasSingleSelection) {
              return
            }
            setConnectionSourceNode(isLinkSource ? null : selectedNodeId)
          }}
          className={[
            'card-editor__btn',
            isLinkSource ? 'card-editor__btn--link-active' : '',
            !hasSingleSelection ? 'card-editor__btn--disabled' : '',
          ].filter(Boolean).join(' ')}
        >
          <span className="card-editor__btn-label">{isLinkSource ? 'Cancel Link' : 'Link'}</span>
          {hasSingleSelection && !isLinkSource && (
            <span className="card-editor__btn-hint">alt+click or long-press</span>
          )}
        </button>
      </div>
    </div>
  )
}
