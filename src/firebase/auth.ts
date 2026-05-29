import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { auth } from './config'

const provider = new GoogleAuthProvider()

// Called directly from a button onClick so the popup is triggered by a user gesture,
// which is required by iOS Safari's popup-blocker policy.
export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, provider)
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

export function subscribeAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback)
}
