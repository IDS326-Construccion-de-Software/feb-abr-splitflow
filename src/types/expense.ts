import type { Timestamp } from 'firebase/firestore'

export type SplitType = 'equal' | 'custom'

export interface ExpenseSplit {
  uid: string
  amount: number
}

export interface Expense {
  id: string
  groupId: string
  description: string
  amount: number
  currency: string
  date: string
  paidBy: string
  splitType: SplitType
  participantIds: string[]
  splits: ExpenseSplit[]
  createdBy: string
  updatedBy: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
  deletedAt?: Timestamp | null
  receiptUrl?: string
}

export interface CreateExpenseInput {
  groupId: string
  description: string
  amount: number
  currency: string
  date: string
  paidBy: string
  splitType: SplitType
  participantIds: string[]
  splits: ExpenseSplit[]
  createdBy: string
}
