import { useEffect, useState } from 'react'
import type { Settlement } from '../../../types/settlement'
import { listenUserSettlements } from '../services/settlementService'

type SettlementsState = {
  userId?: string
  settlements: Settlement[]
  loading: boolean
  error: string | null
}

export const useUserSettlements = (userId?: string) => {
  const [state, setState] = useState<SettlementsState>({
    userId,
    settlements: [],
    loading: Boolean(userId),
    error: null,
  })

  useEffect(() => {
    if (!userId) return

    const unsub = listenUserSettlements(
      userId,
      (items) => {
        setState({
          userId,
          settlements: items,
          loading: false,
          error: null,
        })
      },
      (err) => {
        console.error('listenUserSettlements error', err)
        setState({
          userId,
          settlements: [],
          loading: false,
          error: 'No pudimos leer tus pagos.',
        })
      },
    )
    return () => unsub()
  }, [userId])

  if (!userId) {
    return { settlements: [], loading: false, error: null }
  }

  if (state.userId !== userId) {
    return { settlements: [], loading: true, error: null }
  }

  return {
    settlements: state.settlements,
    loading: state.loading,
    error: state.error,
  }
}
