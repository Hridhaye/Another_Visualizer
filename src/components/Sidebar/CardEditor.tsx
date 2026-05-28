import { useNarrativeBoardStore, type EditorField } from '../../store/useNarrativeBoardStore'

type EditorButtonDef = {
  field: EditorField | 'body'
  label: string
  hint: (val: string) => string
}

const EDITOR_BUTTONS: EditorButtonDef[] = [
  { field: 'code',       label: 'Code',           hint: (v) => v },
  { field: 'title',      label: 'Title',          hint: (v) => v || '—' },
  { field: 'summary',    label: 'Summary',        hint: (v) => v ? v.slice(0, 32) + (v.length > 32 ? '…' : '') : '—' },
  { field: 'references', label: 'References',     hint: (v) => v || 'none' },
  { field: 'slipType',   label: 'Slip',           hint: () => '' },
  { field: 'puzzleType', label: 'Puzzle',         hint: (v) => v || 'none' },
  { field: 'body',       label: 'Narrative Body', hint: () => '' },
]

export function CardEditor() {
  const selectedNodeId = useNarrativeBoardStore((s) => s.selectedNodeId)
  const nodes = useNarrativeBoardStore((s) => s.nodes)
  const slipTypes = useNarrativeBoardStore((s) => s.slipTypes)
  const activeEditorField = useNarrativeBoardStore((s) => s.activeEditorField)
  const narrativeBodyOpen = useNarrativeBoardStore((s) => s.narrativeBodyOpen)
  const openEditorField = useNarrativeBoardStore((s) => s.openEditorField)
  const closeEditorField = useNarrativeBoardStore((s) => s.closeEditorField)
  const openNarrativeBody = useNarrativeBoardStore((s) => s.openNarrativeBody)
  const closeNarrativeBody = useNarrativeBoardStore((s) => s.closeNarrativeBody)
  const connectionSourceNodeId = useNarrativeBoardStore((s) => s.connectionSourceNodeId)
  const setConnectionSourceNode = useNarrativeBoardStore((s) => s.setConnectionSourceNode)

  const node = nodes.find((n) => n.id === selectedNodeId) ?? null
  const hasSelection = !!node

  function getHint(field: EditorField | 'body'): string {
    if (!node) return ''
    switch (field) {
      case 'code':       return node.data.code
      case 'title':      return node.data.title ? node.data.title.slice(0, 28) + (node.data.title.length > 28 ? '…' : '') : '—'
      case 'summary':    return node.data.summary ? node.data.summary.slice(0, 28) + (node.data.summary.length > 28 ? '…' : '') : '—'
      case 'references': return node.data.referencesText || 'none'
      case 'slipType': {
        const slip = slipTypes.find((s) => s.id === node.data.slipTypeId)
        return slip?.name ?? '—'
      }
      case 'puzzleType': return node.data.puzzleType || 'none'
      case 'body':       return node.data.body ? 'has content' : 'empty'
      default:           return ''
    }
  }

  function getSlipColor(field: EditorField | 'body'): string | null {
    if (field !== 'slipType' || !node) return null
    const slip = slipTypes.find((s) => s.id === node.data.slipTypeId)
    return slip?.color ?? null
  }

  function isActive(field: EditorField | 'body'): boolean {
    if (field === 'body') return narrativeBodyOpen
    return activeEditorField === field
  }

  function toggle(field: EditorField | 'body') {
    if (!hasSelection) return
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

  return (
    <div className="card-editor">
      {!hasSelection && (
        <p className="card-editor__empty-hint">Select a card to edit its fields</p>
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
              disabled={!hasSelection}
              onClick={() => toggle(field)}
              className={[
                'card-editor__btn',
                active ? 'card-editor__btn--active' : '',
                !hasSelection ? 'card-editor__btn--disabled' : '',
                isBody ? 'card-editor__btn--body' : '',
              ].filter(Boolean).join(' ')}
            >
              <span className="card-editor__btn-label">{label}</span>
              {hasSelection && hint && (
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

        {/* Link button — always visible, top-level */}
        {(() => {
          const isLinkSource = hasSelection && connectionSourceNodeId === selectedNodeId
          return (
            <button
              disabled={!hasSelection}
              onClick={() => {
                if (!hasSelection) return
                setConnectionSourceNode(isLinkSource ? null : selectedNodeId)
              }}
              className={[
                'card-editor__btn',
                isLinkSource ? 'card-editor__btn--link-active' : '',
                !hasSelection ? 'card-editor__btn--disabled' : '',
              ].filter(Boolean).join(' ')}
            >
              <span className="card-editor__btn-label">{isLinkSource ? 'Cancel Link' : 'Link'}</span>
              {hasSelection && !isLinkSource && (
                <span className="card-editor__btn-hint">alt+click or long-press</span>
              )}
            </button>
          )
        })()}
      </div>
    </div>
  )
}
