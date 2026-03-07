import { useEffect, useState } from 'react'
import type { Expense } from '../../../types/expense'
import { listenUserExpenses } from '../services/expenseService'

type ExpensesState = {
  userId?: string
  expenses: Expense[]
  loading: boolean
  error: string | null
}

export const useUserExpenses = (userId?: string) => {
  const [state, setState] = useState<ExpensesState>({
    userId,
    expenses: [],
    loading: Boolean(userId),
    error: null,
  })

  useEffect(() => {
    if (!userId) return

    const unsub = listenUserExpenses(
      userId,
      (items) => {
        setState({
          userId,
          expenses: items,
          loading: false,
          error: null,
        })
      },
      (err) => {
        console.error('listenUserExpenses error', err)
        setState({
          userId,
          expenses: [],
          loading: false,
          error: 'No pudimos leer tus gastos.',
        })
      },
    )
    return () => unsub()
  }, [userId])

  if (!userId) {
    return { expenses: [], loading: false, error: null }
  }

  if (state.userId !== userId) {
    return { expenses: [], loading: true, error: null }
  }

  return {
    expenses: state.expenses,
    loading: state.loading,
    error: state.error,
  }
}
