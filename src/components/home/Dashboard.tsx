import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { useUserExpenses } from '../../features/expenses/hooks/useUserExpenses'
import { useUserSettlements } from '../../features/settlements/hooks/useUserSettlements'
import { useGroups } from '../../features/groups/hooks/useGroups'
import { computeGroupNetBalances, formatCurrency, normalizeCurrency } from '../../lib/utils/calculations'
import UserAvatar from '../common/UserAvatar'

const round2 = (n: number) => Math.round(n * 100) / 100

const Dashboard = () => {
  const { profile, user } = useAuth()
  const { expenses, loading: expLoading } = useUserExpenses(user?.uid)
  const { settlements, loading: setLoading } = useUserSettlements(user?.uid)
  const { groups, loading: groupsLoading } = useGroups(user?.uid)
  const displayCurrency = normalizeCurrency(profile?.currency)
  const profileName = profile?.displayName || profile?.email || 'Usuario Demo'

  const summary = useMemo(() => {
    if (!user) return { owedToMe: 0, iOwe: 0 }

    const contextIds = new Set<string>(['__no_group__'])
    expenses.forEach((expense) => contextIds.add(expense.groupId || '__no_group__'))
    settlements.forEach((settlement) => contextIds.add(settlement.groupId || '__no_group__'))

    let owedToMe = 0
    let iOwe = 0

    contextIds.forEach((contextId) => {
      const scopedExpenses =
        contextId === '__no_group__'
          ? expenses.filter((expense) => !expense.groupId)
          : expenses.filter((expense) => expense.groupId === contextId)

      const scopedSettlements =
        contextId === '__no_group__'
          ? settlements.filter((settlement) => !settlement.groupId)
          : settlements.filter((settlement) => settlement.groupId === contextId)

      const myNet = computeGroupNetBalances(scopedExpenses, scopedSettlements, undefined, displayCurrency)[user.uid] || 0
      if (myNet > 0) owedToMe += myNet
      if (myNet < 0) iOwe += Math.abs(myNet)
    })

    return {
      owedToMe: round2(owedToMe),
      iOwe: round2(iOwe),
    }
  }, [displayCurrency, expenses, settlements, user])

  const { owedToMe, iOwe } = summary

  const groupBalances = useMemo(() => {
    if (!user) return []

    return groups.map((group) => {
      const gExpenses = expenses.filter((expense) => expense.groupId === group.id)
      const gSettlements = settlements.filter((settlement) => settlement.groupId === group.id)
      const net = computeGroupNetBalances(gExpenses, gSettlements, undefined, displayCurrency)
      const my = net[user.uid] || 0
      return { ...group, my }
    })
  }, [displayCurrency, groups, expenses, settlements, user])

  const isLoading = expLoading || setLoading || groupsLoading
  const activityCount = expenses.length + settlements.length

  return (
    <div className="relative min-h-screen pb-24">
      <div className="relative overflow-hidden rounded-b-[2.4rem] bg-slate-950 text-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.9)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.18),transparent_30%)]" />
        <div className="relative mx-auto max-w-5xl px-5 pb-12 pt-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-100">
                Panorama diario
              </span>
              <p className="mt-4 text-3xl font-semibold leading-tight sm:text-[2.35rem]">
                Hola, {profile?.displayName || 'Usuario Demo'}
              </p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                Aquí tienes una lectura rápida de lo que te deben, lo que debes y cómo se están moviendo tus grupos.
              </p>
            </div>
            <Link to="/profile" aria-label="Abrir perfil">
              <UserAvatar
                name={profileName}
                photoURL={profile?.photoURL}
                className="border border-white/10 bg-white/10 ring-white/30 backdrop-blur"
              />
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <HighlightPill label="Grupos activos" value={groups.length.toString()} />
            <HighlightPill label="Gastos registrados" value={expenses.length.toString()} />
            <HighlightPill label="Movimientos" value={activityCount.toString()} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <SummaryCard
              label="Me deben"
              amount={owedToMe}
              currency={displayCurrency}
              gradient="from-emerald-400 via-teal-400 to-cyan-400"
              helper="Créditos abiertos en tus grupos"
              icon={<TrendUpIcon />}
            />
            <SummaryCard
              label="Debo"
              amount={iOwe}
              currency={displayCurrency}
              gradient="from-sky-500 via-blue-500 to-indigo-500"
              helper="Pendientes por liquidar"
              icon={<TrendDownIcon />}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4">
        <div className="-mt-9 grid gap-3 md:grid-cols-2">
          <QuickAction
            to="/groups"
            label="Ver grupos"
            description="Entra a tus grupos y revisa balances internos."
            icon={<UsersIcon />}
            accent="from-sky-500/20 to-cyan-500/10 text-sky-700"
          />
          <QuickAction
            to="/balances"
            label="Abrir saldos"
            description="Consulta quién te debe y qué falta por pagar."
            icon={<WalletIcon />}
            accent="from-fuchsia-500/20 to-violet-500/10 text-violet-700"
          />
        </div>

        <section className="mt-7 rounded-[2rem] border border-white/80 bg-white/[0.88] p-5 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Tus grupos</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Actividad por grupo</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {groupBalances.length} activos
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {isLoading &&
              [1, 2].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-[1.6rem] bg-slate-100/80 px-4 py-3">
                  <div className="h-full rounded-[1.25rem] bg-slate-200/60" />
                </div>
              ))}

            {!isLoading && groupBalances.length === 0 && (
              <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eff6ff_100%)] px-5 py-6 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Aún no tienes grupos.</p>
                <p className="mt-1">Crea el primero para empezar a dividir gastos con un panorama más claro.</p>
                <Link
                  to="/groups/new"
                  className="mt-4 inline-flex rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                >
                  Crear grupo
                </Link>
              </div>
            )}

            {!isLoading &&
              groupBalances.map((group) => {
                const positive = group.my >= 0
                const tone = positive
                  ? 'border-emerald-100 bg-[linear-gradient(135deg,#f8fffc_0%,#ffffff_55%)]'
                  : 'border-rose-100 bg-[linear-gradient(135deg,#fff8f8_0%,#ffffff_55%)]'

                return (
                  <Link
                    key={group.id}
                    to={`/groups/${group.id}`}
                    className={`group flex items-center gap-4 rounded-[1.6rem] border px-4 py-4 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.65)] transition hover:-translate-y-0.5 ${tone}`}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
                      <UsersIcon />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">{group.name}</p>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {group.memberIds.length} miembros
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {positive ? 'Balance a favor en este grupo.' : 'Tienes saldo pendiente por liquidar.'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        {positive ? 'Te deben' : 'Debes'}
                      </p>
                      <p className={`mt-1 text-base font-semibold ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(group.my, displayCurrency)}
                      </p>
                    </div>
                    <ArrowRightIcon />
                  </Link>
                )
              })}
          </div>
        </section>
      </div>
    </div>
  )
}

export default Dashboard

type QuickActionProps = {
  to: string
  label: string
  description: string
  icon: ReactNode
  accent: string
}

const QuickAction = ({ to, label, description, icon, accent }: QuickActionProps) => (
  <Link
    to={to}
    className="group rounded-[1.8rem] border border-white/80 bg-white/[0.88] p-4 text-left shadow-[0_24px_70px_-55px_rgba(15,23,42,0.65)] backdrop-blur transition hover:-translate-y-0.5"
  >
    <div className="flex items-start justify-between gap-3">
      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} shadow-sm`}>
        {icon}
      </span>
      <ArrowRightIcon className="text-slate-300 transition group-hover:text-slate-500" />
    </div>
    <p className="mt-4 text-sm font-semibold text-slate-900">{label}</p>
    <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
  </Link>
)

type SummaryCardProps = {
  label: string
  amount: number
  currency: string
  gradient: string
  helper: string
  icon: ReactNode
}

const SummaryCard = ({ label, amount, currency, gradient, helper, icon }: SummaryCardProps) => (
  <div className={`rounded-[1.8rem] bg-gradient-to-r ${gradient} px-5 py-5 text-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.75)]`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium opacity-90">{label}</p>
        <p className="mt-2 text-3xl font-bold leading-tight">{formatCurrency(amount, currency)}</p>
      </div>
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12">{icon}</span>
    </div>
    <p className="mt-4 text-xs leading-5 text-white/85">{helper}</p>
  </div>
)

const HighlightPill = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm">
    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300">{label}</p>
    <p className="mt-1 text-xl font-semibold text-white">{value}</p>
  </div>
)

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="16.5" cy="9" r="3.5" />
    <circle cx="7.5" cy="9" r="3.5" />
    <path d="M3 19c0-2.485 2.239-4 5-4h1" />
    <path d="M13.5 15h1c2.761 0 5 1.515 5 4" />
  </svg>
)

const WalletIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="3" y="6" width="18" height="12" rx="2.5" />
    <path d="M17 12.5h2.5" />
    <circle cx="16" cy="12.5" r="1" fill="currentColor" />
  </svg>
)

const TrendUpIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15.5 9.5 10l3.5 3.5L20 6.5" />
    <path d="M14.5 6.5H20V12" />
  </svg>
)

const TrendDownIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 8.5 9.5 14l3.5-3.5L20 17.5" />
    <path d="M14.5 17.5H20V12" />
  </svg>
)

const ArrowRightIcon = ({ className = 'text-slate-300' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`h-5 w-5 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
)
