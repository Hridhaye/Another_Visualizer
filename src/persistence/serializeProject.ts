import type { CardGroup, SerializedMetadata, SerializedProject, SerializedViewport } from '../types/narrative'
import type { NarrativeNode, SlipType } from '../types/narrative'

export type ProjectSnapshot = {
  nodes: NarrativeNode[]
  slipTypes: SlipType[]
  groups: CardGroup[]
  viewport: SerializedViewport
  metadata?: Partial<SerializedMetadata>
}

export function serializeProject(snapshot: ProjectSnapshot): SerializedProject {
  const createdAt = snapshot.metadata?.createdAt ?? new Date().toISOString()
  const updatedAt = snapshot.metadata?.updatedAt ?? createdAt

  return {
    version: 1,
    metadata: {
      projectName: snapshot.metadata?.projectName ?? 'Mystery Board',
      createdAt,
      updatedAt
    },
    viewport: snapshot.viewport,
    slipTypes: snapshot.slipTypes.map((item) => ({ ...item })),
    groups: snapshot.groups.map((group) => ({
      ...group,
      nodeIds: [...group.nodeIds]
    })),
    nodes: snapshot.nodes.map((node) => ({
      ...node,
      data: { ...node.data }
    }))
  }
}

export function createProjectFilename(prefix = 'mystery-board'): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.json`
}
