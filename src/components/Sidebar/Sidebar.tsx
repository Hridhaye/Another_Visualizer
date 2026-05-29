import type { ReactNode } from 'react'
import type { User } from 'firebase/auth'

import type { NarrativeNode, SectionKey, SectionOpenState, SlipType } from '../../types/narrative'
import { BoardControls } from './BoardControls'
import { CardEditor } from './CardEditor'
import { SlipManager } from './SlipManager'

type SidebarProps = {
  collapsed: boolean
  sectionsOpen: SectionOpenState
  nodes: NarrativeNode[]
  slipTypes: SlipType[]
  onToggleSidebar: () => void
  onToggleSection: (key: SectionKey) => void
  onImportAIFormat: (text: string) => Promise<{ createdCount: number; updatedCount: number }>
  onAddSlipType: (name: string, color: string) => void
  onRenameSlipType: (id: string, name: string) => void
  onDeleteSlipType: (id: string) => void
  projectName: string
  updatedAt: string
  hasUnsavedChanges: boolean
  onProjectNameChange: (value: string) => void
  currentUser: User | null
  authLoading: boolean
  onCloudSave: () => Promise<void>
  onCloudLoad: () => Promise<void>
  cloudSaveLoading: boolean
  cloudLoadLoading: boolean
  lastCloudSyncAt: Date | null
}

type SectionProps = {
  title: string
  accentClass: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}

function Section({ title, accentClass, open, onToggle, children }: SectionProps) {
  return (
    <section className={`sidebar-section ${accentClass}`}>
      <button onClick={onToggle} className="sidebar-section__toggle">
        <span className="sidebar-section__title">{title}</span>
        <span className="sidebar-section__chevron">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="sidebar-section__body">{children}</div>}
    </section>
  )
}

export function Sidebar({
  collapsed,
  sectionsOpen,
  nodes,
  slipTypes,
  onToggleSidebar,
  onToggleSection,
  onImportAIFormat,
  onAddSlipType,
  onRenameSlipType,
  onDeleteSlipType,
  projectName,
  updatedAt,
  hasUnsavedChanges,
  onProjectNameChange,
  currentUser,
  authLoading,
  onCloudSave,
  onCloudLoad,
  cloudSaveLoading,
  cloudLoadLoading,
  lastCloudSyncAt,
}: SidebarProps) {
  return (
    <aside className={collapsed ? 'sidebar sidebar--collapsed' : 'sidebar'}>
      <div className="sidebar__header">
        <div className="sidebar__header-row">
          {!collapsed && (
            <div className="sidebar__brand">
              <h1 className="sidebar__title">Mystery Board</h1>
              <p className="sidebar__subtitle">Non-linear narrative plotting</p>
            </div>
          )}
          <button
            onClick={onToggleSidebar}
            className="sidebar__collapse-btn"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="sidebar__content">
          <Section
            title="Board"
            accentClass="sidebar-section--board"
            open={sectionsOpen.boardControls}
            onToggle={() => onToggleSection('boardControls')}
          >
            <BoardControls
              nodes={nodes}
              slipTypes={slipTypes}
              projectName={projectName}
              updatedAt={updatedAt}
              hasUnsavedChanges={hasUnsavedChanges}
              onImportAIFormat={onImportAIFormat}
              onProjectNameChange={onProjectNameChange}
              currentUser={currentUser}
              authLoading={authLoading}
              onCloudSave={onCloudSave}
              onCloudLoad={onCloudLoad}
              cloudSaveLoading={cloudSaveLoading}
              cloudLoadLoading={cloudLoadLoading}
              lastCloudSyncAt={lastCloudSyncAt}
            />
          </Section>

          <Section
            title="Slips"
            accentClass="sidebar-section--slips"
            open={sectionsOpen.slipManager}
            onToggle={() => onToggleSection('slipManager')}
          >
            <SlipManager
              slipTypes={slipTypes}
              onAddSlipType={onAddSlipType}
              onRenameSlipType={onRenameSlipType}
              onDeleteSlipType={onDeleteSlipType}
            />
          </Section>

          <Section
            title="Card Editor"
            accentClass="sidebar-section--editor"
            open={sectionsOpen.cardEditor}
            onToggle={() => onToggleSection('cardEditor')}
          >
            <CardEditor />
          </Section>
        </div>
      )}
    </aside>
  )
}
