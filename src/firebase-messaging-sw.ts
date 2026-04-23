import { initializeApp } from 'firebase/app'
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'

type NotificationClickEventLike = Event & {
  notification: Notification & { data?: { link?: string } }
  waitUntil: (promise: Promise<unknown>) => void
}

type WindowClientLike = {
  focus: () => Promise<WindowClientLike>
  navigate?: (url: string) => Promise<WindowClientLike | null>
  url: string
}

type ServiceWorkerGlobalLike = typeof self & {
  clients: {
    matchAll: (options?: { includeUncontrolled?: boolean; type?: 'window' }) => Promise<WindowClientLike[]>
    openWindow: (url: string) => Promise<WindowClientLike | null>
  }
  registration: {
    showNotification: (title: string, options?: NotificationOptions) => Promise<void>
  }
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const sw = self as ServiceWorkerGlobalLike
const app = initializeApp(firebaseConfig)
const messaging = getMessaging(app)

onBackgroundMessage(messaging, (payload) => {
  const title = payload.data?.title ?? payload.notification?.title ?? 'SplitFlow'
  const body = payload.data?.body ?? payload.notification?.body ?? 'Tienes una nueva notificacion.'
  const link = payload.data?.link ?? payload.fcmOptions?.link ?? '/friends'

  void sw.registration.showNotification(title, {
    body,
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: payload.messageId ?? payload.data?.friendshipId,
    data: { link },
  })
})

sw.addEventListener('notificationclick', (event) => {
  const notificationEvent = event as NotificationClickEventLike
  const link = notificationEvent.notification.data?.link ?? '/friends'
  notificationEvent.notification.close()

  notificationEvent.waitUntil(openOrFocusClient(link))
})

const openOrFocusClient = async (link: string) => {
  const targetUrl = new URL(link, self.location.origin).toString()
  const clients = await sw.clients.matchAll({ includeUncontrolled: true, type: 'window' })

  const matchingClient = clients.find((client) => client.url === targetUrl)
  if (matchingClient) {
    await matchingClient.focus()
    return
  }

  const appClient = clients[0]
  if (appClient?.navigate) {
    const navigatedClient = await appClient.navigate(targetUrl)
    await navigatedClient?.focus()
    return
  }

  await sw.clients.openWindow(targetUrl)
}
