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
    <div className="px-4 pb-4">
      <div className="flex flex-col gap-2">
        <input
          value={newSlipName}
          onChange={(event) => {
            setNewSlipName(event.target.value)
          }}
          placeholder="Slip name"
          className="w-full rounded bg-zinc-800 px-3 py-2"
        />

        <input
          type="color"
          value={newSlipColor}
          onChange={(event) => {
            setNewSlipColor(event.target.value)
          }}
          className="h-12 w-full rounded bg-zinc-800"
        />

        <button
          onClick={() => {
            onAddSlipType(newSlipName, newSlipColor)
            setNewSlipName('')
            setNewSlipColor('#a855f7')
          }}
          className="rounded-md bg-purple-600 px-4 py-2 text-base font-medium hover:bg-purple-500"
        >
          Add Slip Type
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {slipTypes.map((slip) => (
          <div
            key={slip.id}
            className="flex items-center justify-between rounded-md bg-zinc-900 px-3 py-2"
          >
            <div className="flex items-center gap-3">
              <div
                className="h-5 w-5 rounded-full border border-zinc-700"
                style={{ background: slip.color }}
              />
              <span className="text-sm text-zinc-200">{slip.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
