import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase/config'
import type { CreateSettlementInput, Settlement } from '../../../types/settlement'

const COLLECTION = 'settlements'

const mapSettlement = (snap: DocumentSnapshot): Settlement => {
  const data = snap.data() as Partial<Settlement> | undefined
  const amount = Number.isFinite(Number(data?.amount)) ? Math.round(Number(data?.amount) * 100) / 100 : 0
  const groupId =
    typeof data?.groupId === 'string' && data.groupId.trim().length > 0 ? data.groupId.trim() : undefined
  const note = typeof data?.note === 'string' && data.note.trim().length > 0 ? data.note.trim() : undefined

  return {
    id: snap.id,
    groupId,
    fromUserId: data?.fromUserId || '',
    toUserId: data?.toUserId || '',
    amount,
    currency: data?.currency || 'RD$',
    date: data?.date || '',
    note,
    createdBy: data?.createdBy || '',
    createdAt: data?.createdAt,
    updatedAt: data?.updatedAt,
  }
}

export const createSettlement = async (input: CreateSettlementInput) => {
  const rawAmount = Number(input.amount)
  const amount = Number.isFinite(rawAmount) ? Math.round(rawAmount * 100) / 100 : 0

  const payload: Record<string, unknown> = {
    fromUserId: input.fromUserId,
    toUserId: input.toUserId,
    amount,
    currency: input.currency,
    date: input.date,
    createdBy: input.fromUserId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const groupId = input.groupId?.trim()
  if (groupId) payload.groupId = groupId

  const note = input.note?.trim()
  if (note) payload.note = note

  const ref = await addDoc(collection(db, COLLECTION), payload)
  return ref.id
}

export const listenUserSettlements = (
  userId: string,
  callback: (items: Settlement[]) => void,
  onError?: (e: unknown) => void,
) => {
  const q1 = query(collection(db, COLLECTION), where('fromUserId', '==', userId))
  const q2 = query(collection(db, COLLECTION), where('toUserId', '==', userId))

  let cache1: Settlement[] = []
  let cache2: Settlement[] = []

  const emit = () => {
    const map = new Map<string, Settlement>()
    cache1.forEach((s) => map.set(s.id, s))
    cache2.forEach((s) => map.set(s.id, s))
    callback(Array.from(map.values()))
  }

  const unsub1 = onSnapshot(
    q1,
    (snap) => {
      cache1 = snap.docs.map((d) => mapSettlement(d))
      emit()
    },
    (e) => onError?.(e),
  )
  const unsub2 = onSnapshot(
    q2,
    (snap) => {
      cache2 = snap.docs.map((d) => mapSettlement(d))
      emit()
    },
    (e) => onError?.(e),
  )

  return () => {
    unsub1()
    unsub2()
  }
}

// Nota: por reglas de seguridad solo podemos leer settlements donde participe el usuario.
// Por eso se combinan dos consultas (fromUserId y toUserId) filtradas por groupId y usuario.
export const listenGroupSettlements = (
  groupId: string,
  userId: string,
  callback: (items: Settlement[]) => void,
  onError?: (e: unknown) => void,
) => {
  const q1 = query(collection(db, COLLECTION), where('groupId', '==', groupId), where('fromUserId', '==', userId))
  const q2 = query(collection(db, COLLECTION), where('groupId', '==', groupId), where('toUserId', '==', userId))

  let cache1: Settlement[] = []
  let cache2: Settlement[] = []

  const emit = () => {
    const map = new Map<string, Settlement>()
    cache1.forEach((s) => map.set(s.id, s))
    cache2.forEach((s) => map.set(s.id, s))
    callback(Array.from(map.values()))
  }

  const unsub1 = onSnapshot(
    q1,
    (snap) => {
      cache1 = snap.docs.map((d) => mapSettlement(d))
      emit()
    },
    (e) => onError?.(e),
  )
  const unsub2 = onSnapshot(
    q2,
    (snap) => {
      cache2 = snap.docs.map((d) => mapSettlement(d))
      emit()
    },
    (e) => onError?.(e),
  )

  return () => {
    unsub1()
    unsub2()
  }
}

export const getSettlement = async (id: string): Promise<Settlement | null> => {
  const ref = doc(db, COLLECTION, id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return mapSettlement(snap)
}

export const updateSettlement = async (id: string, data: Partial<CreateSettlementInput>) => {
  const ref = doc(db, COLLECTION, id)
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  }

  if (data.fromUserId) payload.fromUserId = data.fromUserId
  if (data.toUserId) payload.toUserId = data.toUserId
  if (data.amount !== undefined) {
    const rawAmount = Number(data.amount)
    payload.amount = Number.isFinite(rawAmount) ? Math.round(rawAmount * 100) / 100 : 0
  }
  if (data.currency) payload.currency = data.currency
  if (data.date) payload.date = data.date
  if (data.groupId !== undefined) {
    const gid = data.groupId?.trim()
    if (gid) payload.groupId = gid
  }
  if (data.note !== undefined) payload.note = data.note?.trim() || ''

  await updateDoc(ref, payload)
}
