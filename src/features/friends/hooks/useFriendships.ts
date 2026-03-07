import { useEffect, useMemo, useState } from 'react'
import type { Friendship } from '../../../types/friendship'
import { subscribeFriendships, updateFriendshipStatus } from '../services/friendService'
import { getUsersByIds } from '../../users/services/userService'
import type { UserProfile } from '../../../types/user'

export type FriendshipView = Friendship & {
  otherUser?: UserProfile
  isIncoming: boolean
}

export const useFriendships = (userId?: string) => {
  const [items, setItems] = useState<FriendshipView[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    const unsubscribe = subscribeFriendships(userId, async (friendships) => {
      const otherIds = Array.from(
        new Set(
          friendships.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId)),
        ),
      )
      const users = await getUsersByIds(otherIds)
      const userMap = new Map(users.map((u) => [u.uid, u]))
      setItems(
        friendships.map((f) => ({
          ...f,
          isIncoming: f.addresseeId === userId,
          otherUser: userMap.get(f.requesterId === userId ? f.addresseeId : f.requesterId),
        })),
      )
      setLoading(false)
    })
    return () => unsubscribe()
  }, [userId])

  const accept = useMemo(
    () => (friendshipId: string) => updateFriendshipStatus(friendshipId, 'accepted'),
    [],
  )

  return { friendships: items, loading, accept }
}
