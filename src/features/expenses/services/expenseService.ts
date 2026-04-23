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
  deleteDoc,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase/config'
import type { CreateExpenseInput, Expense, ExpenseSplit } from '../../../types/expense'

const EXPENSES_COLLECTION = 'expenses'

type StoredExpenseSplit = Partial<ExpenseSplit> & { userId?: string }

const mapExpense = (snap: DocumentSnapshot): Expense => {
  const data = snap.data() as Partial<Expense> | undefined
  const splitsRaw: StoredExpenseSplit[] = Array.isArray(data?.splits) ? (data.splits as StoredExpenseSplit[]) : []
  const participantIds = Array.isArray(data?.participantIds) ? data!.participantIds : []
  const toAmount = (n: unknown) => {
    const num = Number(n)
    return Number.isFinite(num) ? Math.round(num * 100) / 100 : 0
  }

  return {
    id: snap.id,
    groupId: typeof data?.groupId === 'string' ? data.groupId : '',
    description: data?.description || '',
    amount: toAmount(data?.amount),
    currency: data?.currency || 'DOP',
    date: data?.date || '',
    paidBy: data?.paidBy || '',
    splitType: (data?.splitType as Expense['splitType']) || 'equal',
    participantIds,
    splits: splitsRaw.map((split) => ({ uid: split.uid || split.userId || '', amount: toAmount(split.amount) })),
    createdBy: data?.createdBy || '',
    updatedBy: data?.updatedBy || '',
    createdAt: data?.createdAt,
    updatedAt: data?.updatedAt,
    deletedAt: data?.deletedAt,
    receiptUrl: data?.receiptUrl,
  }
}

export const listenGroupExpenses = (groupId: string, callback: (items: Expense[]) => void) => {
  const q = query(collection(db, EXPENSES_COLLECTION), where('groupId', '==', groupId))
  return onSnapshot(q, (snapshot) => callback(snapshot.docs.map((d) => mapExpense(d))))
}

export const listenUserExpenses = (
  userId: string,
  callback: (items: Expense[]) => void,
  onError?: (e: unknown) => void,
) => {
  const q = query(collection(db, EXPENSES_COLLECTION), where('participantIds', 'array-contains', userId))
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map((d) => mapExpense(d))),
    (e) => onError?.(e),
  )
}

export const listenExpense = (expenseId: string, callback: (expense: Expense | null) => void) => {
  const ref = doc(db, EXPENSES_COLLECTION, expenseId)
  return onSnapshot(ref, (snap) => callback(snap.exists() ? mapExpense(snap) : null))
}

export const createExpense = async (input: CreateExpenseInput) => {
  const toAmount = (n: unknown) => {
    const num = Number(n)
    return Number.isFinite(num) ? Math.round(num * 100) / 100 : 0
  }

  const ref = await addDoc(collection(db, EXPENSES_COLLECTION), {
    ...input,
    amount: toAmount(input.amount),
    splits: input.splits.map((s) => ({ uid: s.uid, amount: toAmount(s.amount) })),
    updatedBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export const updateExpense = async (
  expenseId: string,
  data: Partial<CreateExpenseInput> & { receiptUrl?: string },
  userId: string,
) => {
  const toAmount = (n: unknown) => {
    const num = Number(n)
    return Number.isFinite(num) ? Math.round(num * 100) / 100 : 0
  }

  const ref = doc(db, EXPENSES_COLLECTION, expenseId)
  const payload: Record<string, unknown> = {
    updatedBy: userId,
    updatedAt: serverTimestamp(),
  }

  if (data.groupId !== undefined) payload.groupId = data.groupId
  if (data.description !== undefined) payload.description = data.description
  if (data.amount !== undefined) payload.amount = toAmount(data.amount)
  if (data.currency !== undefined) payload.currency = data.currency
  if (data.date !== undefined) payload.date = data.date
  if (data.paidBy !== undefined) payload.paidBy = data.paidBy
  if (data.splitType !== undefined) payload.splitType = data.splitType
  if (data.participantIds !== undefined) payload.participantIds = data.participantIds
  if (data.splits !== undefined) payload.splits = data.splits.map((s) => ({ uid: s.uid, amount: toAmount(s.amount) }))
  if (data.receiptUrl !== undefined) payload.receiptUrl = data.receiptUrl

  await updateDoc(ref, payload)
}

export const deleteExpense = async (expenseId: string) => {
  const ref = doc(db, EXPENSES_COLLECTION, expenseId)
  await deleteDoc(ref)
}

export const getExpense = async (expenseId: string): Promise<Expense | null> => {
  const ref = doc(db, EXPENSES_COLLECTION, expenseId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return mapExpense(snap)
}
