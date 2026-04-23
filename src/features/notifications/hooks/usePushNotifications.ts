import { useCallback, useEffect, useState } from 'react'
import {
  browserSupportsPushNotifications,
  disablePushNotifications,
  enablePushNotifications,
  getPushPermission,
  hasSavedPushToken,
  isPushMarkedEnabled,
  refreshSavedPushToken,
  type PushPermission,
} from '../services/pushNotificationService'

export const usePushNotifications = (userId?: string) => {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<PushPermission>(getPushPermission())
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const nextSupported = await browserSupportsPushNotifications()
        const nextPermission = getPushPermission()

        if (!active) return

        setSupported(nextSupported)
        setPermission(nextPermission)

        if (!userId || !nextSupported || nextPermission !== 'granted') {
          setEnabled(false)
          return
        }

        const saved = await hasSavedPushToken(userId)

        if (saved || isPushMarkedEnabled(userId)) {
          await refreshSavedPushToken(userId)
        }

        if (active) setEnabled(saved || isPushMarkedEnabled(userId))
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'No pudimos revisar las notificaciones.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [userId])

  const enable = useCallback(async () => {
    if (!userId) return

    try {
      setActionLoading(true)
      setMessage(null)
      setError(null)
      await enablePushNotifications(userId)
      setPermission(getPushPermission())
      setEnabled(true)
      setMessage('Notificaciones activadas para solicitudes de amistad.')
    } catch (err) {
      setPermission(getPushPermission())
      setError(err instanceof Error ? err.message : 'No pudimos activar las notificaciones.')
    } finally {
      setActionLoading(false)
    }
  }, [userId])

  const disable = useCallback(async () => {
    if (!userId) return

    try {
      setActionLoading(true)
      setMessage(null)
      setError(null)
      await disablePushNotifications(userId)
      setPermission(getPushPermission())
      setEnabled(false)
      setMessage('Notificaciones desactivadas en este navegador.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos desactivar las notificaciones.')
    } finally {
      setActionLoading(false)
    }
  }, [userId])

  return {
    supported,
    permission,
    enabled,
    loading,
    actionLoading,
    message,
    error,
    enable,
    disable,
  }
}
