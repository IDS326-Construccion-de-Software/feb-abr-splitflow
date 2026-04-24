import { updateProfile } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../../../lib/firebase/config'
import type { UserProfile } from '../../../types/user'

const USERS_COLLECTION = 'users'

type EditableProfileFields = Pick<
  UserProfile,
  'displayName' | 'currency' | 'photoURL' | 'phoneNumber' | 'location' | 'bio'
>

export const updateUserProfile = async (data: Partial<EditableProfileFields>) => {
  const user = auth.currentUser
  if (!user) throw new Error('No hay sesión')

  if (data.displayName !== undefined || data.photoURL !== undefined) {
    await updateProfile(user, {
      displayName: data.displayName ?? user.displayName,
      photoURL: data.photoURL === undefined ? user.photoURL : data.photoURL,
    })
  }

  const updates: Partial<EditableProfileFields> & {
    updatedAt: string
  } = {
    updatedAt: new Date().toISOString(),
  }

  if (data.displayName !== undefined) updates.displayName = data.displayName
  if (data.currency !== undefined) updates.currency = data.currency
  if (data.photoURL !== undefined) updates.photoURL = data.photoURL
  if (data.phoneNumber !== undefined) updates.phoneNumber = data.phoneNumber
  if (data.location !== undefined) updates.location = data.location
  if (data.bio !== undefined) updates.bio = data.bio

  const ref = doc(db, USERS_COLLECTION, user.uid)
  await updateDoc(ref, updates)
}
