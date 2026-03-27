import type { NavigateFunction } from 'react-router-dom'

const getHistoryIndex = () => {
  if (typeof window === 'undefined') return 0

  const state = window.history.state as { idx?: unknown } | null
  return typeof state?.idx === 'number' ? state.idx : 0
}

export const navigateBack = (navigate: NavigateFunction, fallback: string) => {
  if (getHistoryIndex() > 0) {
    navigate(-1)
    return
  }

  navigate(fallback, { replace: true })
}
