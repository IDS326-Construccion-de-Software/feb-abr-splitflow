import type { Timestamp } from 'firebase/firestore'

export type FriendshipStatus = 'pending' | 'accepted'

export interface Friendship {
  id: string
  requesterId: string
  addresseeId: string
  status: FriendshipStatus
  createdAt?: Timestamp
  updatedAt?: Timestamp
}
