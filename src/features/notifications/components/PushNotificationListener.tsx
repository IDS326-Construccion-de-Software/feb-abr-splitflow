import { useEffect, useState } from 'react'
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import {
  showForegroundNotification,
  subscribeToForegroundMessages,
} from '../services/pushNotificationService'
import { useAuth } from '../../auth/hooks/useAuth'
import { db } from '../../../lib/firebase/config'
import type { UserProfile } from '../../../types/user'

type InAppNotification = {
  id: string
  title: string
  body: string
  link: string
}

const PushNotificationListener = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<InAppNotification[]>([])

  useEffect(() => {
    let active = true
    let unsubscribe: () => void = () => undefined

    void subscribeToForegroundMessages((payload) => {
      showForegroundNotification(payload)
      setNotifications((current) =>
        upsertNotification(current, {
          id: payload.messageId ?? payload.data?.friendshipId ?? crypto.randomUUID(),
          title: payload.notification?.title ?? payload.data?.title ?? 'Nueva notificacion',
          body: payload.notification?.body ?? payload.data?.body ?? 'Tienes una nueva actividad pendiente.',
          link: payload.fcmOptions?.link ?? payload.data?.link ?? '/friends',
        }),
      )
    })
      .then((nextUnsubscribe) => {
        if (active) {
          unsubscribe = nextUnsubscribe
        } else {
          nextUnsubscribe()
        }
      })
      .catch((err) => {
        console.error('No pudimos escuchar notificaciones en primer plano.', err)
      })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user?.uid || typeof window === 'undefined' || !('Notification' in window)) return

    let initialSnapshotLoaded = false
    const friendshipsQuery = query(collection(db, 'friendships'), where('addresseeId', '==', user.uid))

    const unsubscribe = onSnapshot(
      friendshipsQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (!initialSnapshotLoaded || change.type !== 'added') return

          const friendship = change.doc.data()
          if (friendship.status !== 'pending' || typeof friendship.requesterId !== 'string') return

          void handleIncomingFriendRequest(change.doc.id, friendship.requesterId, setNotifications)
        })

        initialSnapshotLoaded = true
      },
      (err) => {
        console.error('No pudimos escuchar solicitudes de amistad para notificaciones.', err)
      },
    )

    return () => unsubscribe()
  }, [user?.uid])

  useEffect(() => {
    if (!notifications.length) return

    const timers = notifications.map((notification) =>
      window.setTimeout(() => {
        setNotifications((current) => current.filter((item) => item.id !== notification.id))
      }, 9000),
    )

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [notifications])

  if (!notifications.length) return null

  return (
    <div className="fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.55)]"
          role="status"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <BellIcon />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
              <p className="mt-1 text-sm leading-5 text-slate-500">{notification.body}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setNotifications((current) => current.filter((item) => item.id !== notification.id))
                    navigate(notification.link)
                  }}
                  className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
                >
                  Ver solicitud
                </button>
                <button
                  onClick={() => setNotifications((current) => current.filter((item) => item.id !== notification.id))}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default PushNotificationListener

const handleIncomingFriendRequest = async (
  friendshipId: string,
  requesterId: string,
  setNotifications: React.Dispatch<React.SetStateAction<InAppNotification[]>>,
) => {
  const requesterSnap = await getDoc(doc(db, 'users', requesterId))
  const requester = requesterSnap.exists() ? (requesterSnap.data() as UserProfile) : null
  const requesterName = requester?.displayName || requester?.email || 'Alguien'
  const link = '/friends'
  const title = 'Nueva solicitud de amistad'
  const body = `${requesterName} quiere agregarte en SplitFlow.`

  setNotifications((current) =>
    upsertNotification(current, {
      id: friendshipId,
      title,
      body,
      link,
    }),
  )

  if (Notification.permission !== 'granted') return

  const notification = new Notification(title, {
    body,
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: friendshipId,
    data: { link },
  })

  notification.onclick = () => {
    window.focus()
    window.location.assign(new URL(link, window.location.origin).toString())
  }
}

const upsertNotification = (current: InAppNotification[], notification: InAppNotification) => {
  return [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 3)
}

const BellIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 17H9" />
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)
