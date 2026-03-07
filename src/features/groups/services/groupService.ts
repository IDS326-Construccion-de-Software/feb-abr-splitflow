import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  updateDoc,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase/config'
import type { CreateGroupInput, Group } from '../../../types/group'

const GROUPS_COLLECTION = 'groups'

const mapGroup = (docSnap: DocumentSnapshot): Group => ({
  id: docSnap.id,
  ...(docSnap.data() as Omit<Group, 'id'>),
})

export const listenUserGroups = (userId: string, callback: (groups: Group[]) => void) => {
  const q = query(collection(db, GROUPS_COLLECTION), where('memberIds', 'array-contains', userId))
  return onSnapshot(q, (snapshot) => {
    const groups = snapshot.docs.map((d) => mapGroup(d))
    callback(groups)
  })
}

export const listenGroupById = (groupId: string, callback: (group: Group | null) => void) => {
  const ref = doc(db, GROUPS_COLLECTION, groupId)
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      callback(null)
      return
    }
    callback(mapGroup(snap))
  })
}

export const createGroup = async (userId: string, data: CreateGroupInput) => {
  const payload: Omit<Group, 'id'> = {
    name: data.name,
    description: data.description?.trim() || '',
    createdBy: userId,
    memberIds: Array.from(new Set([userId, ...data.memberIds])),
    admins: [userId],
    createdAt: serverTimestamp() as unknown as Group['createdAt'],
    updatedAt: serverTimestamp() as unknown as Group['updatedAt'],
  }
  const ref = await addDoc(collection(db, GROUPS_COLLECTION), payload)
  return ref.id
}

export const updateGroup = async (groupId: string, data: Partial<CreateGroupInput>) => {
  const ref = doc(db, GROUPS_COLLECTION, groupId)
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export const getGroup = async (groupId: string): Promise<Group | null> => {
  const ref = doc(db, GROUPS_COLLECTION, groupId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return mapGroup(snap)
}
