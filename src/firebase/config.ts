import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

// Firebase web config is intentionally public — security is enforced by Firestore rules.
// Replace these placeholder values with your project's config from:
// Firebase Console → Project settings → Your apps → SDK setup and configuration
const firebaseConfig = {
  apiKey: 'AIzaSyBN04lmNNhMOB6gghVtShxB2pVQuXG9O9Y',
  authDomain: 'visualizer-tool.firebaseapp.com',
  projectId: 'visualizer-tool',
  storageBucket: 'visualizer-tool.firebasestorage.app',
  messagingSenderId: '775356310143',
  appId: '1:775356310143:web:cbf31852e2d572f9a4954a',
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const auth = getAuth(app)



