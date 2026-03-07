import { useEffect, useState } from 'react'
import type { Expense } from '../../../types/expense'
import { listenGroupExpenses } from '../services/expenseService'

export const useGroupExpenses = (groupId?: string) => {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId) return
    const unsub = listenGroupExpenses(groupId, (items) => {
      setExpenses(items)
      setLoading(false)
    })
    return () => unsub()
  }, [groupId])

  return { expenses, loading }
}
