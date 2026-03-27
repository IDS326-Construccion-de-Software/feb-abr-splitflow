import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { useFriendships } from '../../features/friends/hooks/useFriendships'
import { useGroups } from '../../features/groups/hooks/useGroups'
import LoadingSpinner from '../common/LoadingSpinner'
import { updateUserProfile } from '../../features/users/services/profileService'
import { navigateBack } from '../../lib/utils/navigation'

const ProfileScreen = () => {
  const { profile, user, loading, logout } = useAuth()
  const { friendships, loading: friendsLoading } = useFriendships(user?.uid)
  const { groups, loading: groupsLoading } = useGroups(user?.uid)
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(profile?.displayName || '')
  const [currency, setCurrency] = useState(profile?.currency || 'RD$')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    setDisplayName(profile?.displayName || '')
    setCurrency(profile?.currency || 'RD$')
  }, [profile?.displayName, profile?.currency])

  const onSave = async () => {
    try {
      setSaving(true)
      setMessage(null)
      await updateUserProfile({ displayName, currency })
      setMessage('Perfil actualizado')
      setEditing(false)
    } catch (err) {
      setMessage('No pudimos actualizar el perfil')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const friendsCount = useMemo(() => friendships.length, [friendships.length])
  const groupsCount = useMemo(() => groups.length, [groups.length])
  const showLoadingStats = friendsLoading || groupsLoading

  if (loading) return <LoadingSpinner label="Cargando perfil..." />

  return (
    <div className="min-h-screen bg-[#f5f7fb] pb-24">
      <div className="relative bg-gradient-to-r from-teal-500 to-sky-500 text-white shadow-md">
        <div className="mx-auto flex max-w-5xl items-start justify-between px-4 pt-4">
          <button
            onClick={() => navigateBack(navigate, '/dashboard')}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15"
            aria-label="Volver"
          >
            <BackIcon />
          </button>
        </div>
        <div className="mx-auto flex max-w-5xl flex-col items-center px-4 pb-10 pt-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/25 text-xl font-bold">
            {profile?.displayName?.[0]?.toUpperCase() || 'U'}
          </div>
          <p className="mt-3 text-lg font-semibold">{profile?.displayName || 'Usuario Demo'}</p>
          <p className="text-sm opacity-90">{profile?.email}</p>
        </div>
      </div>

      <main className="mx-auto mt-4 flex max-w-5xl flex-col gap-4 px-4">
        <section className="rounded-2xl bg-white px-5 py-4 shadow-sm shadow-slate-200/60">
          <header className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-900">
            <span>Información Personal</span>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="text-teal-600 hover:underline">
                Editar
              </button>
            ) : (
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => {
                    setEditing(false)
                    setDisplayName(profile?.displayName || '')
                    setCurrency(profile?.currency || 'RD$')
                  }}
                  className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 px-3 py-1 font-semibold text-white shadow-sm hover:brightness-105 disabled:opacity-60"
                >
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            )}
          </header>

          <div className="divide-y divide-slate-100 text-sm text-slate-700">
            <InfoRow
              label="Nombre"
              value={
                editing ? (
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                ) : (
                  displayName || '—'
                )
              }
            />
            <InfoRow label="Correo electrónico" value={profile?.email || '—'} />
            <InfoRow
              label="Moneda por defecto"
              value={
                editing ? (
                  <select
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="RD$">RD$</option>
                    <option value="USD">USD</option>
                  </select>
                ) : (
                  currency
                )
              }
            />
          </div>
          {message && <p className="mt-2 text-xs text-teal-700">{message}</p>}
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <StatCard
            label="Amigos"
            value={friendsCount}
            icon={<FriendsIcon />}
            bg="from-emerald-50 to-emerald-50"
            loading={showLoadingStats}
          />
          <StatCard
            label="Grupos"
            value={groupsCount}
            icon={<DollarIcon />}
            bg="from-indigo-50 to-indigo-50"
            loading={showLoadingStats}
          />
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm shadow-slate-200/60">
          <ActionRow label="Gestionar amigos" onClick={() => navigate('/friends')} />
          <ActionRow label="Ver todos los saldos" onClick={() => navigate('/balances')} withDivider={false} />
        </section>

        <button
          onClick={logout}
          className="mt-2 flex h-12 items-center justify-center rounded-xl bg-red-500 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
        >
          <LogoutIcon />
          <span className="ml-2">Cerrar Sesión</span>
        </button>
      </main>
    </div>
  )
}

export default ProfileScreen

const InfoRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-2 sm:items-center">
    <span className="text-xs font-semibold text-slate-500">{label}</span>
    <div className="text-sm font-medium text-slate-900">{value}</div>
  </div>
)

const StatCard = ({
  label,
  value,
  icon,
  bg,
  loading,
}: {
  label: string
  value: number
  icon: React.ReactNode
  bg: string
  loading: boolean
}) => (
  <div className={`rounded-2xl bg-gradient-to-r ${bg} px-4 py-4 shadow-sm shadow-slate-200/60`}>
    <div className="flex items-center gap-2 text-slate-800">
      <span className="text-lg text-emerald-600">{icon}</span>
      <span className="text-sm font-semibold">{label}</span>
    </div>
    <p className="mt-2 text-2xl font-bold text-slate-900">{loading ? '—' : value}</p>
  </div>
)

const ActionRow = ({
  label,
  onClick,
  withDivider = true,
}: {
  label: string
  onClick: () => void
  withDivider?: boolean
}) => (
  <button
    onClick={onClick}
    className={`flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 ${withDivider ? 'border-b border-slate-100' : ''}`}
  >
    {label}
    <ArrowRightIcon />
  </button>
)

const BackIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="m15 5-7 7 7 7" />
  </svg>
)

const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="m9 5 7 7-7 7" />
  </svg>
)

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <path d="M10 17 15 12 10 7" />
    <path d="M15 12H3" />
  </svg>
)

const FriendsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="8" cy="9" r="3.5" />
    <path d="M2.5 18c0-2.485 2.239-4 5-4H10" />
    <circle cx="17" cy="9.5" r="3" />
    <path d="M13.5 18c0-2.485 2.239-4 5-4" />
  </svg>
)

const DollarIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M12 3v18" />
    <path d="M16.5 7.5c0-2.5-6.5-2.5-6.5 0 0 3 7 2 7 5.5 0 3-6.5 3.5-8.5 1.5" />
  </svg>
)
