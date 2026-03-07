import { useEffect, useState } from 'react'
import { listenUserGroups } from '../services/groupService'
import type { Group } from '../../../types/group'

export const useGroups = (userId: string | undefined) => {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    const unsubscribe = listenUserGroups(userId, (items) => {
      setGroups(items)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [userId])

  return { groups, loading }
}
