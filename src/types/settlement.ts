import type { Timestamp } from 'firebase/firestore'

export interface Settlement {
  id: string
  groupId?: string
  fromUserId: string
  toUserId: string
  amount: number
  currency: string
  date: string
  note?: string
  createdBy: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface CreateSettlementInput {
  groupId?: string
  fromUserId: string
  toUserId: string
  amount: number
  currency: string
  date: string
  note?: string
}
