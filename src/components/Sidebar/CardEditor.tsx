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
    <div className="sidebar-panel sidebar-stack">
      <div>
        <label className="sidebar-label">Code</label>
        <input
          value={selectedNode.data.code}
          onChange={(event) => {
            onUpdateNode(selectedNode.id, { code: event.target.value })
          }}
          className="sidebar-input"
        />
      </div>

      <div>
        <label className="sidebar-label">Title</label>
        <input
          value={selectedNode.data.title}
          onChange={(event) => {
            onUpdateNode(selectedNode.id, { title: event.target.value })
          }}
          className="sidebar-input"
        />
      </div>

      <div>
        <label className="sidebar-label">Summary</label>
        <textarea
          value={selectedNode.data.summary}
          onChange={(event) => {
            onUpdateNode(selectedNode.id, { summary: event.target.value })
          }}
          className="sidebar-input sidebar-input--summary"
        />
      </div>

      <div>
        <label className="sidebar-label">References</label>
        <input
          value={selectedNode.data.referencesText}
          onChange={(event) => {
            onUpdateNode(selectedNode.id, { referencesText: event.target.value })
          }}
          placeholder="AA02, AB03, CV11"
          className="sidebar-input"
        />
      </div>

      <div>
        <label className="sidebar-label">Narrative Body</label>
        <textarea
          value={selectedNode.data.body}
          onChange={(event) => {
            onUpdateNode(selectedNode.id, { body: event.target.value })
          }}
          className="sidebar-input sidebar-input--body"
        />
      </div>

      <div>
        <label className="sidebar-label">Slip Type</label>
        <select
          value={selectedNode.data.slipTypeId}
          onChange={(event) => {
            onUpdateNode(selectedNode.id, { slipTypeId: event.target.value })
          }}
          className="sidebar-input"
        >
          {slipTypes.map((slip) => (
            <option key={slip.id} value={slip.id}>
              {slip.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="sidebar-label">Puzzle Type</label>
        <select
          value={selectedNode.data.puzzleType}
          onChange={(event) => {
            onUpdateNode(selectedNode.id, {
              puzzleType: event.target.value as CardData['puzzleType']
            })
          }}
          className="sidebar-input"
        >
          {PUZZLE_TYPES.map((puzzleType) => (
            <option key={puzzleType} value={puzzleType}>
              {puzzleType.charAt(0).toUpperCase() + puzzleType.slice(1)}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
