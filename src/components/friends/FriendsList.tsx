import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { addFriendSchema, type AddFriendFormValues } from '../../lib/validations/friendSchemas'
import { sendFriendRequest } from '../../features/friends/services/friendService'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { useFriendships } from '../../features/friends/hooks/useFriendships'
import { friendlyAuthError } from '../../lib/utils/firebaseErrors'
import { navigateBack } from '../../lib/utils/navigation'
import UserAvatar from '../common/UserAvatar'

const FriendsList = () => {
  const { user } = useAuth()
  const { friendships, loading, accept, remove } = useFriendships(user?.uid)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddFriendFormValues>({
    resolver: zodResolver(addFriendSchema),
    defaultValues: { email: '' },
  })

  const acceptedCount = useMemo(() => friendships.filter((item) => item.status === 'accepted').length, [friendships])
  const pendingCount = useMemo(() => friendships.filter((item) => item.status === 'pending').length, [friendships])
  const incomingPending = useMemo(
    () => friendships.filter((item) => item.status === 'pending' && item.isIncoming).length,
    [friendships],
  )

  const sortedFriendships = useMemo(
    () =>
      [...friendships].sort((a, b) => {
        const score = (item: (typeof friendships)[number]) => {
          if (item.status === 'pending' && item.isIncoming) return 0
          if (item.status === 'pending') return 1
          return 2
        }

        return score(a) - score(b)
      }),
    [friendships],
  )

  const onSubmit = handleSubmit(async (values) => {
    if (!user) return
    try {
      setError(null)
      await sendFriendRequest(user.uid, values.email)
      reset()
      setShowForm(false)
    } catch (err) {
      const fallback = err instanceof Error ? err.message : friendlyAuthError(err)
      setError(fallback)
      console.error(err)
    }
  })

  const handleAccept = async (friendshipId: string) => {
    try {
      setError(null)
      setAcceptingId(friendshipId)
      await accept(friendshipId)
    } catch (err) {
      const fallback = err instanceof Error ? err.message : friendlyAuthError(err)
      setError(fallback)
    } finally {
      setAcceptingId(null)
    }
  }

  const handleRemove = async (friendship: (typeof friendships)[number]) => {
    const actionLabel =
      friendship.status === 'accepted'
        ? 'eliminar a este amigo'
        : friendship.isIncoming
          ? 'eliminar esta solicitud'
          : 'cancelar esta solicitud'

    const confirmed = window.confirm(`Quieres ${actionLabel}?`)
    if (!confirmed) return

    try {
      setError(null)
      setRemovingId(friendship.id)
      await remove(friendship.id)
    } catch (err) {
      const fallback = err instanceof Error ? err.message : friendlyAuthError(err)
      setError(fallback)
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="relative overflow-hidden rounded-b-[2.2rem] bg-slate-950 text-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.9)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.18),transparent_30%)]" />
        <div className="relative mx-auto max-w-5xl px-4 pb-8 pt-5">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => navigateBack(navigate, '/dashboard')}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15"
              aria-label="Volver"
            >
              <BackIcon />
            </button>
            <button
              onClick={() => setShowForm((value) => !value)}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:brightness-105"
            >
              <UserPlusIcon />
              {showForm ? 'Cerrar formulario' : 'Agregar amigo'}
            </button>
          </div>

          <div className="mt-6 max-w-3xl">
            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-100">
              Red personal
            </span>
            <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-[2.35rem]">Gestiona tus amigos con mas orden</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Revisa solicitudes, acepta invitaciones y mantén una lista limpia para crear grupos mas rapido.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <HeroMetric label="Amigos" value={acceptedCount.toString()} helper="Conexiones ya aceptadas" />
            <HeroMetric label="Pendientes" value={pendingCount.toString()} helper="Solicitudes en curso" />
            <HeroMetric label="Por revisar" value={incomingPending.toString()} helper="Invitaciones que recibiste" />
          </div>
        </div>
      </header>

      <main className="mx-auto mt-6 flex max-w-5xl flex-col gap-5 px-4">
        {showForm && (
          <section className="rounded-[2rem] border border-white/80 bg-white/[0.9] p-5 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Invitacion</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">Enviar solicitud por correo</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Escribe un correo valido de alguien que ya tenga cuenta en la app.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Paso unico</span>
            </div>

            <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder="correo@ejemplo.com"
                className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-slate-300"
                {...register('email')}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <SendIcon />
                {isSubmitting ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            </form>

            {(errors.email || error) && (
              <div className="mt-4 rounded-[1.35rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errors.email?.message || error}
              </div>
            )}
          </section>
        )}

        {!showForm && error && (
          <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">{error}</div>
        )}

        <section className="rounded-[2rem] border border-white/80 bg-white/[0.9] p-5 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Listado</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Solicitudes y amigos</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Las solicitudes entrantes pendientes aparecen primero para que no se te escapen.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {friendships.length} registros
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {loading &&
              [1, 2, 3].map((item) => (
                <div key={item} className="h-24 animate-pulse rounded-[1.6rem] bg-slate-100" />
              ))}

            {!loading && sortedFriendships.length === 0 && (
              <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-5 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Todavia no tienes amigos agregados</p>
                <p className="mt-1 leading-6">
                  Usa el boton de arriba para enviar tu primera solicitud y empezar a compartir grupos mas facil.
                </p>
              </div>
            )}

            {!loading &&
              sortedFriendships.map((friendship) => {
                const name = friendship.otherUser?.displayName || friendship.otherUser?.email || 'Usuario'
                const email = friendship.otherUser?.email || 'Sin correo visible'
                const incomingPendingCard = friendship.status === 'pending' && friendship.isIncoming
                const pendingCard = friendship.status === 'pending'

                return (
                  <div
                    key={friendship.id}
                    className={`rounded-[1.6rem] border px-4 py-4 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.65)] ${
                      incomingPendingCard
                        ? 'border-amber-100 bg-[linear-gradient(135deg,#fffbeb_0%,#ffffff_55%)]'
                        : pendingCard
                          ? 'border-sky-100 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_55%)]'
                          : 'border-white/80 bg-white/[0.95]'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={name} photoURL={friendship.otherUser?.photoURL} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                            <StatusPill status={friendship.status} incoming={friendship.isIncoming} />
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-500">{email}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {incomingPendingCard && (
                          <button
                            type="button"
                            onClick={() => handleAccept(friendship.id)}
                            disabled={acceptingId === friendship.id}
                            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <CheckIcon />
                            {acceptingId === friendship.id ? 'Aceptando...' : 'Aceptar'}
                          </button>
                        )}
                        {!incomingPendingCard && friendship.status === 'accepted' && (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
                            Conectado
                          </span>
                        )}
                        {!incomingPendingCard && friendship.status === 'pending' && (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
                            Esperando respuesta
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemove(friendship)}
                          disabled={removingId === friendship.id}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <TrashIcon />
                          {removingId === friendship.id
                            ? 'Eliminando...'
                            : friendship.status === 'accepted'
                              ? 'Eliminar amigo'
                              : friendship.isIncoming
                                ? 'Eliminar solicitud'
                                : 'Cancelar solicitud'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </section>
      </main>
    </div>
  )
}

export default FriendsList

const StatusPill = ({ status, incoming }: { status: 'pending' | 'accepted'; incoming: boolean }) => {
  if (status === 'accepted') {
    return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Aceptado</span>
  }

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        incoming ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'
      }`}
    >
      {incoming ? 'Solicitud recibida' : 'Pendiente'}
    </span>
  )
}

const HeroMetric = ({ label, value, helper }: { label: string; value: string; helper: string }) => (
  <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.06] px-4 py-4 backdrop-blur-sm">
    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300">{label}</p>
    <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    <p className="mt-1 text-xs leading-5 text-slate-300">{helper}</p>
  </div>
)

const BackIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="m15 5-7 7 7 7" />
  </svg>
)

const UserPlusIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="9" cy="9" r="3.5" />
    <path d="M3.5 18c0-2.485 2.239-4 5-4H11" />
    <path d="M17 8v6M14 11h6" />
  </svg>
)

const SendIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 20 21 12 3 4l3 8-3 8Z" />
    <path d="M6 12h10" />
  </svg>
)

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 13 4 4L19 7" />
  </svg>
)

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16" />
    <path d="m10 11 .5 6M14 11l-.5 6" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
  </svg>
)
