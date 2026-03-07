import type { Timestamp } from 'firebase/firestore'

export interface Group {
  id: string
  name: string
  description?: string
  createdBy: string
  memberIds: string[]
  admins: string[]
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface CreateGroupInput {
  name: string
  description?: string
  memberIds: string[]
}
