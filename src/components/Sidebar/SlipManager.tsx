import { useState } from 'react'

import type { SlipType } from '../../types/narrative'

type SlipManagerProps = {
  slipTypes: SlipType[]
  onAddSlipType: (name: string, color: string) => void
}

export function SlipManager({ slipTypes, onAddSlipType }: SlipManagerProps) {
  const [newSlipName, setNewSlipName] = useState('')
  const [newSlipColor, setNewSlipColor] = useState('#a855f7')

  return (
    <div className="sidebar-panel">
      <div className="sidebar-stack">
        <div>
          <label className="sidebar-label">Slip Name</label>
          <input
            value={newSlipName}
            onChange={(event) => {
              setNewSlipName(event.target.value)
            }}
            placeholder="Slip name"
            className="sidebar-input"
          />
        </div>

        <div>
          <label className="sidebar-label">Color</label>
          <input
            type="color"
            value={newSlipColor}
            onChange={(event) => {
              setNewSlipColor(event.target.value)
            }}
            className="sidebar-input sidebar-input--color"
          />
        </div>

        <button
          onClick={() => {
            onAddSlipType(newSlipName, newSlipColor)
            setNewSlipName('')
            setNewSlipColor('#a855f7')
          }}
          className="sidebar-btn sidebar-btn--purple"
        >
          Add Slip Type
        </button>
      </div>

      <div className="sidebar-list">
        {slipTypes.map((slip) => (
          <div key={slip.id} className="sidebar-list-item">
            <div className="sidebar-list-item__left">
              <div className="sidebar-dot" style={{ background: slip.color }} />
              <span>{slip.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
