import { useEffect, useState } from 'react'
import type { Expense } from '../../../types/expense'
import { listenExpense } from '../services/expenseService'

export const useExpense = (expenseId?: string) => {
  const [expense, setExpense] = useState<Expense | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!expenseId) return
    const unsub = listenExpense(expenseId, (item) => {
      setExpense(item)
      setLoading(false)
    })
    return () => unsub()
  }, [expenseId])

  return { expense, loading }
}
