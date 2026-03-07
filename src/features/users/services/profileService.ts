import { updateProfile } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../../../lib/firebase/config'
import type { UserProfile } from '../../../types/user'

const USERS_COLLECTION = 'users'

export const updateUserProfile = async (data: Partial<Pick<UserProfile, 'displayName' | 'currency' | 'photoURL'>>) => {
  const user = auth.currentUser
  if (!user) throw new Error('No hay sesión')

  if (data.displayName || data.photoURL) {
    await updateProfile(user, {
      displayName: data.displayName ?? user.displayName,
      photoURL: data.photoURL ?? user.photoURL,
    })
  }

  const ref = doc(db, USERS_COLLECTION, user.uid)
  await updateDoc(ref, {
    displayName: data.displayName,
    currency: data.currency,
    photoURL: data.photoURL,
    updatedAt: new Date().toISOString(),
  })
}
