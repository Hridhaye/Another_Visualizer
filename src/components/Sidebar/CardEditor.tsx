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
    <div className="px-4 pb-4">
      <div className="flex flex-col gap-2">
        <div>
          <label className="text-sm text-zinc-400">Code</label>
          <input
            value={selectedNode.data.code}
            onChange={(event) => {
              onUpdateNode(selectedNode.id, { code: event.target.value })
            }}
            className="mt-1 w-full rounded-md bg-zinc-800 px-3 py-2 text-base"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400">Title</label>
          <input
            value={selectedNode.data.title}
            onChange={(event) => {
              onUpdateNode(selectedNode.id, { title: event.target.value })
            }}
            className="mt-1 w-full rounded-md bg-zinc-800 px-3 py-2 text-base"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400">Summary</label>
          <textarea
            value={selectedNode.data.summary}
            onChange={(event) => {
              onUpdateNode(selectedNode.id, { summary: event.target.value })
            }}
            className="mt-1 min-h-[120px] w-full rounded-md bg-zinc-800 px-3 py-2 text-base"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400">References</label>
          <input
            value={selectedNode.data.referencesText}
            onChange={(event) => {
              onUpdateNode(selectedNode.id, { referencesText: event.target.value })
            }}
            placeholder="AA02, AB03, CV11"
            className="mt-1 w-full rounded-md bg-zinc-800 px-3 py-2 text-base"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400">Narrative Body</label>
          <textarea
            value={selectedNode.data.body}
            onChange={(event) => {
              onUpdateNode(selectedNode.id, { body: event.target.value })
            }}
            className="mt-1 min-h-[220px] w-full rounded-md bg-zinc-800 px-3 py-2 font-mono text-sm leading-6"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400">Slip Type</label>
          <select
            value={selectedNode.data.slipTypeId}
            onChange={(event) => {
              onUpdateNode(selectedNode.id, { slipTypeId: event.target.value })
            }}
            className="mt-1 w-full rounded-md bg-zinc-800 px-3 py-2 text-base"
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
