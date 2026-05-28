type BoardControlsProps = {
  onAddCard: () => void
  onExportProject: () => void
}

export function BoardControls({
  onAddCard,
  onExportProject
}: BoardControlsProps) {
  return (
    <div className="px-4 pb-4">
      <button
        onClick={onAddCard}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-base font-semibold transition-colors hover:bg-blue-500"
      >
        Add Card
      </button>

      <button
        onClick={onExportProject}
        className="mt-3 w-full rounded-lg bg-zinc-700 px-4 py-2.5 text-base font-semibold transition-colors hover:bg-zinc-600"
      >
        Save JSON
      </button>
    </div>
  )
}
