import { useState } from 'react'
import type { SlipType } from '../../types/narrative'

type SlipManagerProps = {
  slipTypes: SlipType[]
  onAddSlipType: (name: string, color: string) => void
}

export function SlipManager({ slipTypes, onAddSlipType }: SlipManagerProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#a855f7')

  function handleAdd() {
    if (!name.trim()) return
    onAddSlipType(name, color)
    setName('')
    setColor('#a855f7')
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
            <span className="slip-name">{slip.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
