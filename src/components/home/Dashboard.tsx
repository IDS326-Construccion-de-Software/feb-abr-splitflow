import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { useUserExpenses } from '../../features/expenses/hooks/useUserExpenses'
import { useUserSettlements } from '../../features/settlements/hooks/useUserSettlements'
import { useGroups } from '../../features/groups/hooks/useGroups'
import { computeGroupNetBalances } from '../../lib/utils/calculations'

const formatRD = (amount: number) => `RD$${Math.abs(amount).toFixed(2)}`

const Dashboard = () => {
  const { profile, user } = useAuth()
  const { expenses, loading: expLoading } = useUserExpenses(user?.uid)
  const { settlements, loading: setLoading } = useUserSettlements(user?.uid)
  const { groups, loading: groupsLoading } = useGroups(user?.uid)

  const globalNet = useMemo(() => computeGroupNetBalances(expenses, settlements), [expenses, settlements])
  const myNet = user ? globalNet[user.uid] || 0 : 0
  const owedToMe = Math.max(myNet, 0)
  const iOwe = Math.max(-myNet, 0)

  const groupBalances = useMemo(() => {
    if (!user) return []
    return groups.map((group) => {
      const gExpenses = expenses.filter((e) => e.groupId === group.id)
      const gSettlements = settlements.filter((s) => s.groupId === group.id)
      const net = computeGroupNetBalances(gExpenses, gSettlements)
      const my = net[user.uid] || 0
      return { ...group, my }
    })
  }, [groups, expenses, settlements, user])

  const isLoading = expLoading || setLoading || groupsLoading
  const addExpenseLink = groupBalances.length === 1 ? `/groups/${groupBalances[0].id}/expenses/new` : '/groups'

  return (
    <div className="relative min-h-screen pb-24">
      <div className="bg-gradient-to-r from-teal-500 to-sky-500 text-white shadow-md">
        <div className="mx-auto max-w-5xl px-5 pb-8 pt-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-semibold leading-tight">Hola, {profile?.displayName || 'Usuario Demo'}</p>
              <p className="text-sm opacity-90">Aquí está tu resumen de hoy</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/15 backdrop-blur">
              <UserIcon />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <SummaryCard label="Me deben" amount={owedToMe} gradient="from-emerald-400 to-teal-500" />
            <SummaryCard label="Debo" amount={iOwe} gradient="from-sky-500 to-blue-500" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4">
        <div className="-mt-10 grid grid-cols-3 gap-2 rounded-2xl bg-white px-4 py-5 shadow-card">
          <QuickAction to={addExpenseLink} label="Agregar gasto" icon={<PlusIcon />} iconBg="bg-emerald-50 text-emerald-600" />
          <QuickAction to="/groups" label="Grupos" icon={<UsersIcon />} iconBg="bg-sky-50 text-sky-600" />
          <QuickAction to="/balances" label="Saldos" icon={<WalletIcon />} iconBg="bg-purple-50 text-purple-600" />
        </div>

        <section className="mt-6">
          <h2 className="text-lg font-semibold text-slate-900">Tus Grupos</h2>
          <div className="mt-3 space-y-3">
            {isLoading &&
              [1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-2xl bg-white/70 px-4 py-3 shadow-card"
                >
                  <div className="h-full rounded-xl bg-slate-200/60" />
                </div>
              ))}

            {!isLoading && groupBalances.length === 0 && (
              <div className="rounded-2xl bg-white px-4 py-5 text-sm text-slate-600 shadow-card">
                Aún no tienes grupos. Crea uno para empezar a dividir gastos.
              </div>
            )}

            {!isLoading &&
              groupBalances.map((group) => {
                const positive = group.my >= 0
                return (
                  <Link
                    key={group.id}
                    to={`/groups/${group.id}`}
                    className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-card transition hover:-translate-y-0.5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{group.name}</p>
                      <p className="text-xs text-slate-500">{group.memberIds.length} miembros</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-500">{positive ? 'Te deben' : 'Debes'}</p>
                      <p className={`text-sm font-semibold ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatRD(group.my)}
                      </p>
                    </div>
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
  icon: ReactNode
  iconBg: string
}

const QuickAction = ({ to, label, icon, iconBg }: QuickActionProps) => (
  <Link
    to={to}
    className="group flex flex-col items-center gap-2 rounded-xl px-2 py-1 text-xs font-semibold text-slate-700 transition hover:text-teal-600"
  >
    <span className={`flex h-12 w-12 items-center justify-center rounded-full ${iconBg} shadow-sm`}>{icon}</span>
    {label}
  </Link>
)

type SummaryCardProps = {
  label: string
  amount: number
  gradient: string
}

const SummaryCard = ({ label, amount, gradient }: SummaryCardProps) => (
  <div className={`rounded-2xl bg-gradient-to-r ${gradient} px-4 py-5 text-white shadow-card`}>
    <p className="text-sm font-medium opacity-90">{label}</p>
    <p className="text-3xl font-bold leading-tight">{formatRD(amount)}</p>
  </div>
)

const UserIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M5 20.5c0-3.038 3.134-5 7-5s7 1.962 7 5" />
  </svg>
)

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8M8 12h8" />
  </svg>
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
