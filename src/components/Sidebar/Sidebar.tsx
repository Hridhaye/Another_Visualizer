import type { ReactNode } from 'react'

import type { CardData, NarrativeNode, SectionKey, SectionOpenState, SlipType } from '../../types/narrative'
import { BoardControls } from './BoardControls'
import { CardEditor } from './CardEditor'
import { SlipManager } from './SlipManager'

type SidebarProps = {
  collapsed: boolean
  sectionsOpen: SectionOpenState
  selectedNode: NarrativeNode | null
  slipTypes: SlipType[]
  onToggleSidebar: () => void
  onToggleSection: (key: SectionKey) => void
  onAddCard: () => void
  onExportProject: () => void
  onAddSlipType: (name: string, color: string) => void
  onUpdateNode: (nodeId: string, patch: Partial<CardData>) => void
}

type SectionProps = {
  title: string
  toneClassName: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}

function Section({ title, toneClassName, open, onToggle, children }: SectionProps) {
  return (
    <div className={`overflow-hidden rounded-2xl border ${toneClassName}`}>
      <button onClick={onToggle} className="flex w-full items-center justify-between p-4 text-left">
        <div className="text-xs font-semibold uppercase tracking-[0.2em]">{title}</div>
        <div className="text-base">{open ? '-' : '+'}</div>
      </button>
      {open ? children : null}
    </div>
  )
}

export function Sidebar({
  collapsed,
  sectionsOpen,
  selectedNode,
  slipTypes,
  onToggleSidebar,
  onToggleSection,
  onAddCard,
  onExportProject,
  onAddSlipType,
  onUpdateNode
}: SidebarProps) {
  return (
    <div
      className={
        collapsed
          ? 'flex w-[28px] flex-col overflow-hidden border-r border-zinc-800 bg-zinc-900 transition-all duration-300'
          : 'flex w-[360px] flex-col overflow-y-auto border-r border-zinc-800 bg-zinc-900 transition-all duration-300'
      }
    >
      <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/70 p-1 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          {!collapsed && (
            <div>
              <h1 className="text-2xl font-bold">Mystery Board</h1>
              <p className="mt-1 text-sm text-zinc-400">
                Non-linear narrative plotting tool
              </p>
            </div>
          )}

          <button
            onClick={onToggleSidebar}
            className="h-6 w-6 shrink-0 rounded-md bg-zinc-800 text-[10px] font-bold transition-colors hover:bg-zinc-700"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '>' : '<'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-4 p-4">
          <Section
            title="Board Controls"
            toneClassName="border-blue-900/40 bg-blue-950/20 text-blue-300/80"
            open={sectionsOpen.boardControls}
            onToggle={() => {
              onToggleSection('boardControls')
            }}
          >
            <BoardControls onAddCard={onAddCard} onExportProject={onExportProject} />
          </Section>

          <Section
            title="Slip Manager"
            toneClassName="border-purple-900/40 bg-purple-950/10 text-purple-300/80"
            open={sectionsOpen.slipManager}
            onToggle={() => {
              onToggleSection('slipManager')
            }}
          >
            <SlipManager slipTypes={slipTypes} onAddSlipType={onAddSlipType} />
          </Section>

          {selectedNode && (
            <Section
              title="Card Editor"
              toneClassName="border-emerald-900/40 bg-emerald-950/10 text-emerald-300/80"
              open={sectionsOpen.cardEditor}
              onToggle={() => {
                onToggleSection('cardEditor')
              }}
            >
              <CardEditor
                selectedNode={selectedNode}
                slipTypes={slipTypes}
                onUpdateNode={onUpdateNode}
              />
            </Section>
          )}
        </div>
      )}
    </div>
  )
}
