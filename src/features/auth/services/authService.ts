import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '../../../lib/firebase/config'
import type { UserProfile } from '../../../types/user'

const USERS_COLLECTION = 'users'

const mapUserToProfile = (user: User, existing?: Partial<UserProfile>): UserProfile => ({
  uid: user.uid,
  email: user.email ?? existing?.email ?? '',
  displayName: user.displayName ?? existing?.displayName ?? '',
  photoURL: user.photoURL ?? existing?.photoURL ?? null,
  currency: existing?.currency ?? 'DOP',
  createdAt: (existing?.createdAt as string | null) ?? null,
  updatedAt: new Date().toISOString(),
})

export const registerWithEmail = async (email: string, password: string, displayName: string) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(user, { displayName })
  await createOrUpdateUserDocument(user)
  return user
}

export const loginWithEmail = async (email: string, password: string) => {
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  await createOrUpdateUserDocument(user)
  return user
}

export const loginWithGoogle = async () => {
  const { user } = await signInWithPopup(auth, googleProvider)
  await createOrUpdateUserDocument(user)
  return user
}

export const logout = () => signOut(auth)

export const createOrUpdateUserDocument = async (user: User) => {
  const userRef = doc(db, USERS_COLLECTION, user.uid)
  const snapshot = await getDoc(userRef)

  if (snapshot.exists()) {
    const existing = snapshot.data() as UserProfile
    const nextData = mapUserToProfile(user, existing)
    await setDoc(
      userRef,
      { ...nextData, updatedAt: serverTimestamp() },
      { merge: true },
    )
    return { ...existing, ...nextData }
  }

  const newData = mapUserToProfile(user)
  await setDoc(userRef, { ...newData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  return newData
}

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback)
}
