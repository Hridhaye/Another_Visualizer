import type { ReactNode } from 'react'

import type { CardData, NarrativeNode, SectionKey, SectionOpenState, SlipType } from '../../types/narrative'
import { BoardControls } from './BoardControls'
import { CardEditor } from './CardEditor'
import { SlipManager } from './SlipManager'

type SidebarProps = {
  collapsed: boolean
  sectionsOpen: SectionOpenState
  nodes: NarrativeNode[]
  selectedNode: NarrativeNode | null
  slipTypes: SlipType[]
  onToggleSidebar: () => void
  onToggleSection: (key: SectionKey) => void
  onAddCard: () => void
  onSaveProject: () => Promise<void>
  onLoadProject: (file: File) => Promise<void>
  onImportAIFormat: (text: string) => Promise<{ createdCount: number; updatedCount: number }>
  onAddSlipType: (name: string, color: string) => void
  onUpdateNode: (nodeId: string, patch: Partial<CardData>) => void
  projectName: string
  updatedAt: string
  hasUnsavedChanges: boolean
  onProjectNameChange: (value: string) => void
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
    <section className={`sidebar-section ${toneClassName} overflow-hidden rounded-lg border border-white/5`}>
      <button onClick={onToggle} className="sidebar-section__toggle flex w-full items-center justify-between px-3 py-2 text-left hover:bg-white/5">
        <div className="sidebar-section__title text-[10px] font-bold uppercase tracking-wider opacity-80">{title}</div>
        <div className="sidebar-section__icon text-xs opacity-50">{open ? '−' : '+'}</div>
      </button>
      {open ? <div className="sidebar-section__content border-t border-white/5">{children}</div> : null}
    </section>
  )
}

export function Sidebar({
  collapsed,
  sectionsOpen,
  nodes,
  selectedNode,
  slipTypes,
  onToggleSidebar,
  onToggleSection,
  onAddCard,
  onSaveProject,
  onLoadProject,
  onImportAIFormat,
  onAddSlipType,
  onUpdateNode,
  projectName,
  updatedAt,
  hasUnsavedChanges,
  onProjectNameChange
}: SidebarProps) {
  return (
    <aside className={collapsed ? 'sidebar sidebar--collapsed' : 'sidebar'}>
      <div className="sidebar__header border-b border-zinc-800 bg-zinc-950/50 px-3 py-2.5 backdrop-blur-md">
        <div className="sidebar__header-row flex items-center justify-between">
          {!collapsed && (
            <div className="sidebar__title-wrap leading-tight">
              <h1 className="sidebar__title text-sm font-bold tracking-tight">Mystery Board</h1>
              <p className="sidebar__subtitle text-[10px] text-zinc-500">Non-linear narrative plotting tool</p>
            </div>
          )}

          <button
            onClick={onToggleSidebar}
            className="sidebar__collapse-btn flex h-6 w-6 items-center justify-center rounded bg-zinc-800 text-[10px] hover:bg-zinc-700"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="sidebar__content flex flex-col gap-2 p-2">
          <Section
            title="Board Controls"
            toneClassName="sidebar-section--board"
            open={sectionsOpen.boardControls}
            onToggle={() => {
              onToggleSection('boardControls')
            }}
          >
            <BoardControls
              nodes={nodes}
              slipTypes={slipTypes}
              projectName={projectName}
              updatedAt={updatedAt}
              hasUnsavedChanges={hasUnsavedChanges}
              onAddCard={onAddCard}
              onSaveProject={onSaveProject}
              onLoadProject={onLoadProject}
              onImportAIFormat={onImportAIFormat}
              onProjectNameChange={onProjectNameChange}
            />
          </Section>

          <Section
            title="Slip Manager"
            toneClassName="sidebar-section--slips"
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
              toneClassName="sidebar-section--editor"
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
    </aside>
  )
}
