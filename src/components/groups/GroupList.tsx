import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { useGroups } from '../../features/groups/hooks/useGroups'
import { navigateBack } from '../../lib/utils/navigation'

const GroupList = () => {
  const { user } = useAuth()
  const { groups, loading } = useGroups(user?.uid)
  const navigate = useNavigate()

  return (
    <div className="min-h-screen pb-24">
      <header className="relative overflow-hidden rounded-b-[2.2rem] bg-slate-950 text-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.9)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.16),transparent_30%)]" />
        <div className="relative mx-auto max-w-5xl px-4 pb-8 pt-5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateBack(navigate, '/dashboard')}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15"
              aria-label="Volver"
            >
              <BackIcon />
            </button>
            <Link
              to="/groups/new"
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:brightness-105"
            >
              <PlusIcon />
              Nuevo grupo
            </Link>
          </div>

          <div className="mt-6 max-w-2xl">
            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-100">
              Organización
            </span>
            <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-[2.3rem]">Tus grupos en un solo lugar</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Entra a cualquier grupo para revisar gastos, balances internos y miembros sin perder el contexto.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <HighlightCard label="Grupos creados" value={groups.length.toString()} helper="Espacios activos para dividir gastos" />
            <HighlightCard
              label="Estado"
              value={loading ? 'Cargando' : groups.length > 0 ? 'Listo' : 'Vacío'}
              helper="Puedes crear uno nuevo en cualquier momento"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto mt-6 flex max-w-5xl flex-col gap-4 px-4">
        {loading &&
          [1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-[1.8rem] bg-white/90 p-4 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.55)]">
              <div className="h-full rounded-[1.35rem] bg-slate-200/60" />
            </div>
          ))}

        {!loading && groups.length === 0 && (
          <div className="rounded-[2rem] border border-dashed border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#eff6ff_100%)] p-6 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.45)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-lg">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Aún sin grupos</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Crea tu primer grupo</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Organiza viajes, salidas o cualquier gasto compartido con un espacio dedicado para miembros y balances.
                </p>
              </div>
              <Link
                to="/groups/new"
                className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Crear ahora
              </Link>
            </div>
          </div>
        )}

        {!loading &&
          groups.map((group) => (
            <Link
              key={group.id}
              to={`/groups/${group.id}`}
              className="group rounded-[1.8rem] border border-white/80 bg-white/[0.92] p-4 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.65)] backdrop-blur transition hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[1.4rem] bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] text-white shadow-sm">
                  <GroupIcon />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-semibold text-slate-900">{group.name}</p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {group.memberIds.length} miembros
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {group.description?.trim() || 'Grupo listo para registrar gastos, revisar saldos y liquidar pendientes.'}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      <span className="rounded-full border border-slate-200 px-2.5 py-1">Detalle</span>
                      <span className="rounded-full border border-slate-200 px-2.5 py-1">Balances</span>
                      <span className="rounded-full border border-slate-200 px-2.5 py-1">Miembros</span>
                    </div>
                    <ArrowRightIcon className="text-slate-300 transition group-hover:text-slate-500" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
      </main>
    </div>
  )
}

export default GroupList

const HighlightCard = ({ label, value, helper }: { label: string; value: string; helper: string }) => (
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

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
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

const ArrowRightIcon = ({ className = 'text-slate-300' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`h-5 w-5 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
)
