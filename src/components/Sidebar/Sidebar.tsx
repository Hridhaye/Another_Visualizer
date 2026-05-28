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
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
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
    <section className={`sidebar-section ${toneClassName}`}>
      <button onClick={onToggle} className="sidebar-section__toggle">
        <div className="sidebar-section__title">{title}</div>
        <div className="sidebar-section__icon">{open ? '-' : '+'}</div>
      </button>
      {open ? <div className="sidebar-section__content">{children}</div> : null}
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
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onProjectNameChange
}: SidebarProps) {
  return (
    <aside className={collapsed ? 'sidebar sidebar--collapsed' : 'sidebar'}>
      <div className="sidebar__header">
        <div className="sidebar__header-row">
          {!collapsed && (
            <div className="sidebar__title-wrap">
              <h1 className="sidebar__title">Mystery Board</h1>
              <p className="sidebar__subtitle">Non-linear narrative plotting tool</p>
            </div>
          )}

          <button
            onClick={onToggleSidebar}
            className="sidebar__collapse-btn"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '>' : '<'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="sidebar__content">
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
              canUndo={canUndo}
              canRedo={canRedo}
              onAddCard={onAddCard}
              onUndo={onUndo}
              onRedo={onRedo}
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
