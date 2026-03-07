import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { addFriendSchema, type AddFriendFormValues } from '../../lib/validations/friendSchemas'
import { sendFriendRequest } from '../../features/friends/services/friendService'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { useFriendships } from '../../features/friends/hooks/useFriendships'
import { friendlyAuthError } from '../../lib/utils/firebaseErrors'

const FriendsList = () => {
  const { user } = useAuth()
  const { friendships, loading } = useFriendships(user?.uid)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
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

  return (
    <div className="min-h-screen bg-[#f5f7fb] pb-24">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
            aria-label="Volver"
          >
            <BackIcon />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">Amigos</h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-card transition hover:brightness-105"
            aria-label="Agregar amigo"
          >
            <UserPlusIcon />
          </button>
        </div>
      </header>

      {showForm && (
        <div className="mx-auto mt-3 max-w-5xl px-4">
          <form
            onSubmit={onSubmit}
            className="rounded-2xl bg-white px-4 py-4 shadow-sm shadow-slate-200/60"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                placeholder="correo@ejemplo.com"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                {...register('email')}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-60"
              >
                {isSubmitting ? 'Enviando…' : 'Enviar solicitud'}
              </button>
            </div>
            {(errors.email || error) && (
              <p className="mt-2 text-xs text-rose-600">{errors.email?.message || error}</p>
            )}
          </form>
        </div>
      )}

      <main className="mx-auto mt-4 flex max-w-5xl flex-col gap-3 px-4">
        {loading &&
          [1, 2, 3].map((i) => (
            <div key={i} className="h-18 animate-pulse rounded-2xl bg-white/80 px-4 py-4 shadow-sm shadow-slate-200/60">
              <div className="h-full rounded-xl bg-slate-200/60" />
            </div>
          ))}

        {!loading && friendships.length === 0 && (
          <div className="rounded-2xl bg-white px-4 py-5 text-sm text-slate-600 shadow-sm shadow-slate-200/60">
            Aún no tienes amigos agregados. Toca el botón de arriba para enviar una solicitud.
          </div>
        )}

        {!loading &&
          friendships.map((f) => {
            const name = f.otherUser?.displayName || f.otherUser?.email || 'Usuario'
            const email = f.otherUser?.email || 'Sin correo'
            const initial = name.trim().charAt(0).toUpperCase()
            return (
              <div
                key={f.id}
                className="flex items-center gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm shadow-slate-200/60"
              >
                <Avatar initial={initial} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{name}</p>
                  <p className="text-xs text-slate-600">{email}</p>
                </div>
              </div>
            )
          })}
      </main>
    </div>
  )
}

export default FriendsList

const Avatar = ({ initial }: { initial: string }) => (
  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 via-fuchsia-500 to-purple-500 text-sm font-semibold text-white shadow-sm">
    {initial || 'A'}
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
