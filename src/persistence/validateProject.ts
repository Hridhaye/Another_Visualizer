import type { CardGroup, NarrativeNode, SerializedMetadata, SerializedProject, SerializedViewport, SlipType } from '../types/narrative'

const SUPPORTED_VERSION = 1

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function toText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function normalizeMetadata(value: unknown): SerializedMetadata {
  if (!isRecord(value)) {
    const now = new Date().toISOString()
    return { projectName: 'Mystery Board', createdAt: now, updatedAt: now }
  }

  const now = new Date().toISOString()

  return {
    projectName: toText(value.projectName, 'Mystery Board'),
    createdAt: toText(value.createdAt, now),
    updatedAt: toText(value.updatedAt, now)
  }
}

function normalizeViewport(value: unknown): SerializedViewport {
  if (!isRecord(value)) {
    return { x: 0, y: 0, zoom: 1 }
  }

  return {
    x: toFiniteNumber(value.x, 0),
    y: toFiniteNumber(value.y, 0),
    zoom: toFiniteNumber(value.zoom, 1)
  }
}

function normalizeSlipType(value: unknown): SlipType | null {
  if (!isRecord(value)) {
    return null
  }

  const id = toText(value.id, '')
  const name = toText(value.name, '')
  const color = toText(value.color, '#52525b')

  if (!id || !name) {
    return null
  }

  return { id, name, color }
}

function normalizeGroup(value: unknown): CardGroup | null {
  if (!isRecord(value)) {
    return null
  }

  const id = toText(value.id, '')
  const name = toText(value.name, '')
  const nodeIds = Array.isArray(value.nodeIds)
    ? value.nodeIds.filter((nodeId): nodeId is string => typeof nodeId === 'string' && nodeId.trim().length > 0)
    : []

  if (!id || !name) {
    return null
  }

  return {
    id,
    name,
    nodeIds: [...new Set(nodeIds)]
  }
}

function normalizeNode(value: unknown): NarrativeNode | null {
  if (!isRecord(value)) {
    return null
  }

  const id = toText(value.id, 'node-' + Math.random().toString(36).slice(2, 10))
  const type = toText(value.type, 'narrativeCard')
  const position = isRecord(value.position)
    ? {
        x: toFiniteNumber(value.position.x, 0),
        y: toFiniteNumber(value.position.y, 0)
      }
    : { x: 0, y: 0 }

  const data = isRecord(value.data)
    ? {
        code: toText(value.data.code, 'AA00'),
        title: toText(value.data.title, 'Untitled Card'),
        summary: toText(value.data.summary, ''),
        body: toText(value.data.body, ''),
        slipTypeId: toText(value.data.slipTypeId, 'blue'),
        slipGivenTypeIds: Array.isArray(value.data.slipGivenTypeIds)
          ? value.data.slipGivenTypeIds.filter((id): id is string => typeof id === 'string')
          : [],
        referencesText: toText(value.data.referencesText, ''),
        puzzleType: ['none', 'fill', 'reorder', 'matching'].includes(String(value.data.puzzleType))
          ? String(value.data.puzzleType)
          : 'none'
      }
    : {
        code: 'AA00',
        title: 'Untitled Card',
        summary: '',
        body: '',
        slipTypeId: 'blue',
        slipGivenTypeIds: [],
        referencesText: '',
        puzzleType: 'none' as const
      }

  return {
    id,
    type,
    position,
    data
  } as NarrativeNode
}

export function validateProject(value: unknown): { ok: true; project: SerializedProject } | { ok: false; error: string } {
  if (!isRecord(value)) {
    return { ok: false, error: 'This file is not a valid project JSON document.' }
  }

  const version = value.version
  if (version !== SUPPORTED_VERSION) {
    return {
      ok: false,
      error: `Unsupported project version ${String(version)}. This app only supports version ${SUPPORTED_VERSION}.`
    }
  }

  const metadata = normalizeMetadata(value.metadata)
  const viewport = normalizeViewport(value.viewport)
  const slipTypes = Array.isArray(value.slipTypes)
    ? value.slipTypes.map(normalizeSlipType).filter((item): item is SlipType => item !== null)
    : []
  const groups = Array.isArray(value.groups)
    ? value.groups.map(normalizeGroup).filter((item): item is CardGroup => item !== null)
    : []
  const nodes = Array.isArray(value.nodes)
    ? value.nodes.map(normalizeNode).filter((item): item is NarrativeNode => item !== null)
    : []

  return {
    ok: true,
    project: {
      version: SUPPORTED_VERSION,
      ...value,
      metadata,
      viewport,
      slipTypes,
      groups,
      nodes
    }
  }
}
