import { useState } from 'react'
import { createPortal } from 'react-dom'

type PanelDSLControlsProps = {
  /** Human label for the modal heading, e.g. "Fill Puzzle". */
  label: string
  /** Produce the DSL text for the current panel content. */
  onExport: () => string
  /** Apply pasted DSL text. Return a short status message (or throw on error). */
  onImport: (text: string) => string
}

/**
 * Copy / Import controls shared by the narrative-body and puzzle panels.
 * Copy writes the panel's DSL to the clipboard; Import opens a textarea modal
 * (rendered via portal so it escapes the panel's overflow) and applies the
 * pasted DSL.
 */
export function PanelDSLControls({ label, onExport, onImport }: PanelDSLControlsProps) {
  const [showModal, setShowModal] = useState(false)
  const [text, setText] = useState('')
  const [feedback, setFeedback] = useState('')

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(onExport())
      setFeedback('Copied')
      setTimeout(() => setFeedback(''), 2000)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to copy.')
    }
  }

  function handleImport() {
    const trimmed = text.trim()
    if (!trimmed) {
      window.alert('Paste DSL text before importing.')
      return
    }
    try {
      const message = onImport(trimmed)
      setShowModal(false)
      setText('')
      setFeedback(message)
      setTimeout(() => setFeedback(''), 3000)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to import.')
    }
  }

  return (
    <>
      <button onClick={handleCopy} className="panel-dsl-btn" title={`Copy ${label} as DSL`}>Copy</button>
      <button onClick={() => setShowModal(true)} className="panel-dsl-btn panel-dsl-btn--amber" title={`Import ${label} DSL`}>Import</button>
      {feedback && <span className="panel-dsl-feedback">{feedback}</span>}

      {showModal && createPortal(
        <div className="dsl-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="dsl-modal">
            <div className="dsl-modal__header">
              <div>
                <p className="dsl-modal__title">Import {label} DSL</p>
                <p className="dsl-modal__subtitle">Paste DSL text. This replaces the panel's current content.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="dsl-modal__close">Close</button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={14}
              className="dsl-modal__textarea"
              placeholder="Paste the DSL for this panel…"
            />
            <div className="dsl-modal__footer">
              <button onClick={() => setShowModal(false)} className="dsl-modal__btn-cancel">Cancel</button>
              <button onClick={handleImport} className="dsl-modal__btn-import">Import</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
