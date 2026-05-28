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
    <div className="px-2 pb-3 pt-1">
      <div className="flex flex-col gap-2.5">
        <input
          value={newSlipName}
          onChange={(event) => {
            setNewSlipName(event.target.value)
          }}
          placeholder="Slip name"
          className="w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-purple-500"
        />

        <input
          type="color"
          value={newSlipColor}
          onChange={(event) => {
            setNewSlipColor(event.target.value)
          }}
          className="h-7 w-full cursor-pointer rounded border border-zinc-800 bg-zinc-900 px-1 py-0.5"
        />

        <button
          onClick={() => {
            onAddSlipType(newSlipName, newSlipColor)
            setNewSlipName('')
            setNewSlipColor('#a855f7')
          }}
          className="rounded-md bg-purple-600 py-1.5 text-xs font-bold text-white hover:bg-purple-500"
        >
          Add Slip Type
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        {slipTypes.map((slip) => (
          <div
            key={slip.id}
            className="flex items-center justify-between rounded border border-zinc-800/50 bg-zinc-900/30 px-2 py-1.5"
          >
            <div className="flex items-center gap-3">
              <div
                className="h-3 w-3 rounded-full border border-zinc-700"
                style={{ background: slip.color }}
              />
              <span className="text-xs text-zinc-300">{slip.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
