import { useEffect, useState } from 'react'
import type { Group } from '../../../types/group'
import { listenGroupById } from '../services/groupService'

export const useGroup = (groupId?: string) => {
  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId) return
    const unsubscribe = listenGroupById(groupId, (data) => {
      setGroup(data)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [groupId])

  return { group, loading }
}
