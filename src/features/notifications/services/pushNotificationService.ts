import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { FirebaseError } from 'firebase/app'
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
} from 'firebase/messaging'
import { app, db } from '../../../lib/firebase/config'

const NOTIFICATION_TOKENS_COLLECTION = 'notificationTokens'
const LOCAL_ENABLED_PREFIX = 'splitflow.push.enabled.'
const SERVICE_WORKER_TIMEOUT_MS = 10000

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY

export type PushPermission = NotificationPermission | 'unsupported'

export const getPushPermission = (): PushPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export const browserSupportsPushNotifications = async () => {
  if (typeof window === 'undefined') return false
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return false

  try {
    return await withTimeout(
      isSupported(),
      5000,
      'No pudimos revisar el soporte de notificaciones en este navegador.',
    )
  } catch {
    return false
  }
}

export const isPushMarkedEnabled = (userId: string) => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(getLocalEnabledKey(userId)) === 'true'
}

export const hasSavedPushToken = async (userId: string) => {
  if (getPushPermission() !== 'granted') return false

  const token = await getRegistrationToken()
  const tokenRef = await getTokenRef(userId, token)
  const tokenSnap = await getDoc(tokenRef)
  return tokenSnap.exists()
}

export const enablePushNotifications = async (userId: string) => {
  if (!(await browserSupportsPushNotifications())) {
    throw new Error('Este navegador no soporta notificaciones push web.')
  }

  if (Notification.permission === 'denied') {
    throw new Error('Las notificaciones estan bloqueadas en el navegador. Habilitalas desde la configuracion del sitio.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('No se concedio permiso para enviar notificaciones.')
  }

  const token = await getRegistrationToken()
  await savePushToken(userId, token)
  localStorage.setItem(getLocalEnabledKey(userId), 'true')

  return token
}

export const refreshSavedPushToken = async (userId: string) => {
  if (getPushPermission() !== 'granted' || !isPushMarkedEnabled(userId)) return false

  const token = await getRegistrationToken()
  await savePushToken(userId, token)
  return true
}

export const disablePushNotifications = async (userId: string) => {
  localStorage.removeItem(getLocalEnabledKey(userId))

  if (!(await browserSupportsPushNotifications()) || getPushPermission() !== 'granted') return

  const messaging = getMessaging(app)
  let token: string | null = null

  try {
    token = await getRegistrationToken()
  } catch (err) {
    console.error('No pudimos obtener el token actual para eliminarlo.', err)
  }

  if (token) {
    const tokenRef = await getTokenRef(userId, token)
    await deleteDoc(tokenRef)
  }

  await deleteToken(messaging)
}

export const subscribeToForegroundMessages = async (
  callback: (payload: MessagePayload) => void,
) => {
  if (!(await browserSupportsPushNotifications()) || getPushPermission() !== 'granted') {
    return () => undefined
  }

  const messaging = getMessaging(app)
  return onMessage(messaging, callback)
}

export const showForegroundNotification = (payload: MessagePayload) => {
  if (getPushPermission() !== 'granted') return

  const title = getPayloadTitle(payload)
  const body = getPayloadBody(payload)
  const link = getPayloadLink(payload)

  const notification = new Notification(title, {
    body,
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: payload.messageId ?? payload.data?.friendshipId,
    data: { link },
  })

  notification.onclick = () => {
    window.focus()
    if (link) window.location.assign(new URL(link, window.location.origin).toString())
  }
}

const getRegistrationToken = async () => {
  if (!vapidKey) {
    throw new Error('Falta configurar VITE_FIREBASE_VAPID_KEY en las variables de entorno.')
  }

  const serviceWorkerRegistration = await getServiceWorkerRegistration()
  const messaging = getMessaging(app)
  const token = await withFirebaseMessagingErrorMessage(
    getToken(messaging, { vapidKey, serviceWorkerRegistration }),
  )

  if (!token) {
    throw new Error('Firebase no devolvio un token de notificaciones para este navegador.')
  }

  return token
}

const getServiceWorkerRegistration = async () => {
  const registration = await withTimeout(
    navigator.serviceWorker.register('/firebase-messaging-sw.js', { type: 'module' }),
    SERVICE_WORKER_TIMEOUT_MS,
    'No pudimos registrar el service worker de notificaciones.',
  )
  await waitForServiceWorkerActivation(registration)
  return registration
}

const waitForServiceWorkerActivation = async (registration: ServiceWorkerRegistration) => {
  if (registration.active) return

  const worker = registration.installing ?? registration.waiting
  if (!worker) return

  await withTimeout(
    new Promise<void>((resolve, reject) => {
      const handleStateChange = () => {
        if (worker.state === 'activated') {
          worker.removeEventListener('statechange', handleStateChange)
          resolve()
        }

        if (worker.state === 'redundant') {
          worker.removeEventListener('statechange', handleStateChange)
          reject(new Error('El service worker de notificaciones no pudo activarse.'))
        }
      }

      worker.addEventListener('statechange', handleStateChange)
      handleStateChange()
    }),
    SERVICE_WORKER_TIMEOUT_MS,
    'El navegador tardo demasiado activando las notificaciones. Recarga la pagina e intenta otra vez.',
  )
}

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs)
      }),
    ])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

const withFirebaseMessagingErrorMessage = async <T,>(promise: Promise<T>): Promise<T> => {
  try {
    return await promise
  } catch (err) {
    if (err instanceof FirebaseError && err.code === 'messaging/token-subscribe-failed') {
      throw new Error(
        'El navegador no pudo registrar el token push. Verifica que la clave VAPID sea del mismo proyecto Firebase, que Cloud Messaging este habilitado y que el navegador no este bloqueando el servicio push.',
      )
    }

    throw err
  }
}

const savePushToken = async (userId: string, token: string) => {
  const tokenRef = await getTokenRef(userId, token)

  await setDoc(
    tokenRef,
    {
      token,
      platform: 'web',
      userAgent: navigator.userAgent,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

const getTokenRef = async (userId: string, token: string) => {
  const tokenId = await hashToken(token)
  return doc(db, 'users', userId, NOTIFICATION_TOKENS_COLLECTION, tokenId)
}

const hashToken = async (token: string) => {
  if (!globalThis.crypto?.subtle) {
    return token.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 900)
  }

  const bytes = new TextEncoder().encode(token)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

const getPayloadTitle = (payload: MessagePayload) => {
  return payload.notification?.title ?? payload.data?.title ?? 'SplitFlow'
}

const getPayloadBody = (payload: MessagePayload) => {
  return payload.notification?.body ?? payload.data?.body ?? 'Tienes una nueva notificacion.'
}

const getPayloadLink = (payload: MessagePayload) => {
  return payload.fcmOptions?.link ?? payload.data?.link ?? '/friends'
}

const getLocalEnabledKey = (userId: string) => `${LOCAL_ENABLED_PREFIX}${userId}`
