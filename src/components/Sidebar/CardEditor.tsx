import { PUZZLE_TYPES, type CardData, type NarrativeNode, type SlipType } from '../../types/narrative'

type CardEditorProps = {
  selectedNode: NarrativeNode | null
  slipTypes: SlipType[]
  onUpdateNode: (nodeId: string, patch: Partial<CardData>) => void
}

export function CardEditor({
  selectedNode,
  slipTypes,
  onUpdateNode
}: CardEditorProps) {
  if (!selectedNode) {
    return null
  }

  return (
    <div className="px-2 pb-3 pt-1">
      <div className="flex flex-col gap-2.5">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Code</label>
          <input
            value={selectedNode.data.code}
            onChange={(event) => {
              onUpdateNode(selectedNode.id, { code: event.target.value })
            }}
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Title</label>
          <input
            value={selectedNode.data.title}
            onChange={(event) => {
              onUpdateNode(selectedNode.id, { title: event.target.value })
            }}
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Summary</label>
          <textarea
            value={selectedNode.data.summary}
            onChange={(event) => {
              onUpdateNode(selectedNode.id, { summary: event.target.value })
            }}
            className="mt-1 min-h-[60px] w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">References</label>
          <input
            value={selectedNode.data.referencesText}
            onChange={(event) => {
              onUpdateNode(selectedNode.id, { referencesText: event.target.value })
            }}
            placeholder="AA02, AB03, CV11"
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Narrative Body</label>
          <textarea
            value={selectedNode.data.body}
            onChange={(event) => {
              onUpdateNode(selectedNode.id, { body: event.target.value })
            }}
            className="mt-1 min-h-[140px] w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5 font-mono text-xs leading-5 text-zinc-200 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Slip Type</label>
          <select
            value={selectedNode.data.slipTypeId}
            onChange={(event) => {
              onUpdateNode(selectedNode.id, { slipTypeId: event.target.value })
            }}
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none"
          >
            {slipTypes.map((slip) => (
              <option key={slip.id} value={slip.id}>
                {slip.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-zinc-400">Puzzle Type</label>
          <select
            value={selectedNode.data.puzzleType}
            onChange={(event) => {
              onUpdateNode(selectedNode.id, {
                puzzleType: event.target.value as CardData['puzzleType']
              })
            }}
            className="mt-1 w-full rounded-md bg-zinc-800 px-3 py-2 text-base"
          >
            {PUZZLE_TYPES.map((puzzleType) => (
              <option key={puzzleType} value={puzzleType}>
                {puzzleType.charAt(0).toUpperCase() + puzzleType.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
