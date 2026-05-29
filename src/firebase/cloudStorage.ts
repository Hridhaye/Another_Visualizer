import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './config'
import type { SerializedProject } from '../types/narrative'

function projectDocRef(uid: string) {
  return doc(db, 'users', uid, 'project', 'main')
}

export async function cloudSaveProject(uid: string, project: SerializedProject): Promise<void> {
  const json = JSON.stringify(project)
  // Firestore documents have a hard 1 MiB limit. Warn early at ~900 KB.
  if (json.length > 900_000) {
    throw new Error(
      'Your project is too large to save to the cloud (limit ~900 KB). ' +
      'Use "Export JSON" as a backup instead.'
    )
  }
  await setDoc(projectDocRef(uid), { data: json, updatedAt: serverTimestamp() })
}

export type CloudLoadResult =
  | { found: true; jsonText: string; updatedAt: Date | null }
  | { found: false }

export async function cloudLoadProject(uid: string): Promise<CloudLoadResult> {
  const snap = await getDoc(projectDocRef(uid))
  if (!snap.exists()) {
    return { found: false }
  }
  const raw = snap.data()
  const jsonText = raw['data'] as string
  const ts = raw['updatedAt']
  const updatedAt: Date | null = ts?.toDate?.() ?? null
  return { found: true, jsonText, updatedAt }
}
