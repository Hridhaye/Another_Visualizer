import { useState } from 'react'
import type { SlipType } from '../../types/narrative'

type SlipManagerProps = {
  slipTypes: SlipType[]
  onAddSlipType: (name: string, color: string) => void
  onRenameSlipType: (id: string, name: string) => void
  onDeleteSlipType: (id: string) => void
}

export function SlipManager({ slipTypes, onAddSlipType, onRenameSlipType, onDeleteSlipType }: SlipManagerProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#a855f7')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  function handleAdd() {
    if (!name.trim()) return
    onAddSlipType(name, color)
    setName('')
    setColor('#a855f7')
  }

  function startEdit(slip: SlipType) {
    setEditingId(slip.id)
    setEditingName(slip.name)
  }

  function commitEdit(id: string) {
    if (editingName.trim()) {
      onRenameSlipType(id, editingName)
    }
    setEditingId(null)
  }

  function handleEditKeyDown(e: React.KeyboardEvent, id: string) {
    if (e.key === 'Enter') commitEdit(id)
    if (e.key === 'Escape') setEditingId(null)
  }

  return (
    <div className="slip-manager">
      <div className="slip-add-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="New slip name…"
          className="sidebar-input"
          style={{ flex: 1 }}
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="slip-color-swatch"
          title="Pick color"
        />
        <button onClick={handleAdd} className="slip-add-btn">Add</button>
      </div>

      <div className="slip-list">
        {slipTypes.map((slip) => (
          <div key={slip.id} className="slip-item">
            <span className="slip-dot" style={{ background: slip.color }} />
            {editingId === slip.id ? (
              <input
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => commitEdit(slip.id)}
                onKeyDown={(e) => handleEditKeyDown(e, slip.id)}
                className="slip-name-input"
              />
            ) : (
              <span
                className="slip-name slip-name--editable"
                onClick={() => startEdit(slip)}
                title="Click to rename"
              >
                {slip.name}
              </span>
            )}
            <button
              className="slip-delete-btn"
              onClick={() => onDeleteSlipType(slip.id)}
              title="Remove slip type"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
