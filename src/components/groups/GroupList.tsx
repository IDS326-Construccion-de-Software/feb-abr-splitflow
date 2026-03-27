import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { useGroups } from '../../features/groups/hooks/useGroups'
import { navigateBack } from '../../lib/utils/navigation'

const GroupList = () => {
  const { user } = useAuth()
  const { groups, loading } = useGroups(user?.uid)
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#f5f7fb] pb-24">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <button
            onClick={() => navigateBack(navigate, '/dashboard')}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
            aria-label="Volver"
          >
            <BackIcon />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">Grupos</h1>
          <Link
            to="/groups/new"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-card transition hover:brightness-105"
            aria-label="Crear grupo"
          >
            <PlusIcon />
          </Link>
        </div>
      </header>

      <main className="mx-auto mt-4 flex max-w-5xl flex-col gap-3 px-4">
        {loading &&
          [1, 2].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl bg-white/80 px-4 py-4 shadow-sm shadow-slate-200/60"
            >
              <div className="h-full rounded-xl bg-slate-200/60" />
            </div>
          ))}

        {!loading && groups.length === 0 && (
          <div className="rounded-2xl bg-white px-4 py-5 text-sm text-slate-600 shadow-sm shadow-slate-200/60">
            Aún no tienes grupos. Crea el primero para empezar a dividir gastos.
          </div>
        )}

        {!loading &&
          groups.map((group) => (
            <Link
              key={group.id}
              to={`/groups/${group.id}`}
              className="flex items-start gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm shadow-slate-200/60 transition hover:-translate-y-0.5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 text-white shadow-sm">
                <GroupIcon />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">{group.name}</p>
                <p className="text-xs text-slate-500">{group.memberIds.length} miembros</p>
                <p className="mt-1 text-xs text-slate-600">{group.description || 'Gastos del grupo'}</p>
              </div>
            </Link>
          ))}
      </main>
    </div>
  )
}

export default GroupList

const BackIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="m15 5-7 7 7 7" />
  </svg>
)

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8M8 12h8" />
  </svg>
)

const GroupIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="9" cy="8.5" r="3.5" />
    <path d="M3.5 18c0-2.485 2.239-4 5-4H11" />
    <circle cx="17" cy="9.5" r="3" />
    <path d="M13.5 18c0-2.485 2.239-4 5-4" />
  </svg>
)
