import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type QuerySnapshot,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase/config'
import type { Friendship, FriendshipStatus } from '../../../types/friendship'
import { getUserByEmail } from '../../users/services/userService'

const FRIENDSHIPS_COLLECTION = 'friendships'

const mapFriendship = (docSnap: DocumentSnapshot): Friendship => ({
  id: docSnap.id,
  ...(docSnap.data() as Omit<Friendship, 'id'>),
})

export const subscribeFriendships = (
  userId: string,
  callback: (items: Friendship[]) => void,
): (() => void) => {
  const q1 = query(collection(db, FRIENDSHIPS_COLLECTION), where('requesterId', '==', userId))
  const q2 = query(collection(db, FRIENDSHIPS_COLLECTION), where('addresseeId', '==', userId))

  const mergeSnapshots = (s1?: QuerySnapshot, s2?: QuerySnapshot) => {
    const map = new Map<string, Friendship>()
    s1?.forEach((d) => map.set(d.id, mapFriendship(d)))
    s2?.forEach((d) => map.set(d.id, mapFriendship(d)))
    callback(Array.from(map.values()))
  }

  let snap1: QuerySnapshot | undefined
  let snap2: QuerySnapshot | undefined

  const unsub1 = onSnapshot(q1, (s) => {
    snap1 = s
    mergeSnapshots(snap1, snap2)
  })
  const unsub2 = onSnapshot(q2, (s) => {
    snap2 = s
    mergeSnapshots(snap1, snap2)
  })

  return () => {
    unsub1()
    unsub2()
  }
}

export const sendFriendRequest = async (currentUid: string, targetEmail: string) => {
  const target = await getUserByEmail(targetEmail)
  if (!target) throw new Error('No encontramos un usuario con ese correo.')
  if (target.uid === currentUid) throw new Error('No puedes agregarte a ti mismo.')

  const existing = await findExistingFriendship(currentUid, target.uid)
  if (existing) {
    if (existing.status === 'accepted') throw new Error('Ya son amigos.')
    if (existing.status === 'pending') throw new Error('Ya hay una solicitud pendiente.')
  }

  await addDoc(collection(db, FRIENDSHIPS_COLLECTION), {
    requesterId: currentUid,
    addresseeId: target.uid,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

const findExistingFriendship = async (a: string, b: string): Promise<Friendship | null> => {
  const q1 = query(
    collection(db, FRIENDSHIPS_COLLECTION),
    where('requesterId', '==', a),
    where('addresseeId', '==', b),
  )
  const q2 = query(
    collection(db, FRIENDSHIPS_COLLECTION),
    where('requesterId', '==', b),
    where('addresseeId', '==', a),
  )
  const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)])
  const docSnap = s1?.docs[0] ?? s2?.docs[0]
  if (!docSnap) return null
  return mapFriendship(docSnap)
}

export const updateFriendshipStatus = async (friendshipId: string, status: FriendshipStatus) => {
  const ref = doc(db, FRIENDSHIPS_COLLECTION, friendshipId)
  await updateDoc(ref, { status, updatedAt: serverTimestamp() })
}

export const deleteFriendship = async (friendshipId: string) => {
  const ref = doc(db, FRIENDSHIPS_COLLECTION, friendshipId)
  await deleteDoc(ref)
}
