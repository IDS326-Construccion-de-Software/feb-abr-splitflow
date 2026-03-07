import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../../lib/firebase/config'
import type { UserProfile } from '../../../types/user'
import { chunkArray } from '../../../lib/utils/chunk'

const USERS_COLLECTION = 'users'

export const getUserByEmail = async (email: string): Promise<UserProfile | null> => {
  const q = query(collection(db, USERS_COLLECTION), where('email', '==', email.toLowerCase()))
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  const docSnap = snapshot.docs[0]
  return { id: docSnap.id, ...(docSnap.data() as UserProfile) }
}

export const getUsersByIds = async (ids: string[]): Promise<UserProfile[]> => {
  if (ids.length === 0) return []
  const chunks = chunkArray(ids, 10)
  const results: UserProfile[] = []

  for (const batch of chunks) {
    const q = query(collection(db, USERS_COLLECTION), where('uid', 'in', batch))
    const snapshot = await getDocs(q)
    snapshot.forEach((docSnap) => results.push({ id: docSnap.id, ...(docSnap.data() as UserProfile) }))
  }

  return results
}

export const getUserById = async (id: string): Promise<UserProfile | null> => {
  const ref = doc(db, USERS_COLLECTION, id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: snap.id, ...(snap.data() as UserProfile) }
}
