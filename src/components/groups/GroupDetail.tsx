import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import LoadingSpinner from '../common/LoadingSpinner'
import { useGroup } from '../../features/groups/hooks/useGroup'
import { getUsersByIds } from '../../features/users/services/userService'
import type { UserProfile } from '../../types/user'
import type { Expense } from '../../types/expense'
import type { Settlement } from '../../types/settlement'
import { useGroupExpenses } from '../../features/expenses/hooks/useGroupExpenses'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { computeGroupNetBalances } from '../../lib/utils/calculations'
import { listenGroupSettlements } from '../../features/settlements/services/settlementService'
import { navigateBack } from '../../lib/utils/navigation'

const GroupDetail = () => {
  const { groupId } = useParams<{ groupId: string }>()
  const { group, loading } = useGroup(groupId)
  const [members, setMembers] = useState<UserProfile[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const { expenses, loading: expensesLoading } = useGroupExpenses(groupId)
  const { user } = useAuth()
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    const loadMembers = async () => {
      if (!group?.memberIds?.length) return
      setLoadingMembers(true)
      try {
        const users = await getUsersByIds(group.memberIds)
        setMembers(users)
      } catch (err) {
        console.error('No se pudieron cargar miembros, usando IDs como fallback', err)
        setMembers(group.memberIds.map((uid) => ({ uid, email: uid, displayName: uid } as UserProfile)))
      } finally {
        setLoadingMembers(false)
      }
    }
    loadMembers()
  }, [group?.memberIds])

  useEffect(() => {
    if (!groupId || !user) return
    const unsub = listenGroupSettlements(groupId, user.uid, (items) => setSettlements(items))
    return () => unsub()
  }, [groupId, user])

  const netBalances = useMemo(() => computeGroupNetBalances(expenses, settlements), [expenses, settlements])
  const myNet = user ? netBalances[user.uid] || 0 : 0

  if (loading) return <LoadingSpinner label="Cargando grupo..." />
  if (!group) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white px-4 py-6 shadow-sm shadow-slate-200/60">
          <p className="text-sm text-slate-600">No pudimos encontrar este grupo.</p>
          <Link to="/groups" className="mt-3 inline-block text-sm font-semibold text-teal-600">
            Volver a grupos
          </Link>
        </div>
      </div>
    )
  }

  const memberList = members.length
    ? members
    : group.memberIds.map((uid) => ({ uid, email: uid, displayName: uid } as UserProfile))

  return (
    <div className="min-h-screen bg-[#f5f7fb] pb-24">
      <div className="bg-gradient-to-r from-teal-500 to-sky-500 text-white shadow-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <button
            onClick={() => navigateBack(navigate, '/groups')}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15"
            aria-label="Volver"
          >
            <BackIcon />
          </button>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15"
            aria-label="Más opciones"
          >
            <DotsIcon />
          </button>
        </div>
        <div className="mx-auto max-w-5xl px-4 pb-6">
          <p className="text-lg font-semibold">{group.name}</p>
          <p className="text-sm opacity-90">{group.description || 'Gastos del grupo'}</p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-300" />
            {group.memberIds.length} miembros
          </div>
        </div>
      </div>

      <main className="mx-auto mt-2 flex max-w-5xl flex-col gap-4 px-4">
        <div className="flex flex-col gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm shadow-slate-200/60 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tu balance</p>
            <p className={`text-xl font-bold ${myNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {myNet >= 0 ? '+' : '-'}RD${Math.abs(myNet).toFixed(2)}
            </p>
          </div>
          <button
            onClick={() => navigate(`/settle-up?groupId=${group.id}`)}
            className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:brightness-105"
          >
            <SettleIcon />
            Liquidar
          </button>
        </div>

        <section className="space-y-3 rounded-2xl bg-white px-4 py-4 shadow-sm shadow-slate-200/60">
          <p className="text-sm font-semibold text-slate-800">Balances del grupo</p>
          {memberList.map((m) => {
            const amount = netBalances[m.uid] || 0
            const positive = amount >= 0
            const name = user && m.uid === user.uid ? 'Tú' : m.displayName || m.email || m.uid
            return (
              <div key={m.uid} className="flex items-center gap-3 rounded-2xl bg-white px-3 py-3 shadow-sm shadow-slate-200/60">
                <Avatar initial={name.trim().charAt(0).toUpperCase()} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{name}</p>
                  <p className="text-xs text-slate-600">{m.email}</p>
                </div>
                <p className={`text-sm font-semibold ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {positive ? '+RD$' : '-RD$'}
                  {Math.abs(amount).toFixed(2)}
                </p>
              </div>
            )
          })}
          {!loadingMembers && memberList.length === 0 && (
            <p className="text-sm text-slate-600">Aún sin miembros cargados.</p>
          )}
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Gastos</p>
            <Link
              to={`/groups/${group.id}/expenses/new`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm transition hover:brightness-105"
            >
              <PlusIcon />
            </Link>
          </div>
          {expensesLoading && <p className="text-sm text-slate-500">Cargando gastos...</p>}
          {!expensesLoading && expenses.length === 0 && (
            <p className="text-sm text-slate-600">Aún no hay gastos en este grupo.</p>
          )}
          <div className="space-y-3">
            {expenses.map((exp) => (
              <Link
                key={exp.id}
                to={`/expenses/${exp.id}`}
                className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm shadow-slate-200/60 transition hover:-translate-y-0.5"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{exp.description}</p>
                  <p className="text-xs text-slate-500">{exp.date}</p>
                  <p className="text-xs text-slate-500">
                    Pagado por {memberList.find((m) => m.uid === exp.paidBy)?.displayName || 'alguien'}
                  </p>
                </div>
                <div className="text-right text-sm font-semibold text-slate-900">
                  <p>
                    {exp.currency}
                    {Number(exp.amount || 0).toFixed(2)}
                  </p>
                  {user && (
                    <p className="text-xs text-slate-500">
                      Tu parte: {exp.currency}
                      {getUserShare(exp, user.uid).toFixed(2)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default GroupDetail

const getUserShare = (expense: Expense, uid: string) => {
  const split = expense.splits.find((s) => s.uid === uid)
  return split ? Number(split.amount || 0) : 0
}

const Avatar = ({ initial }: { initial: string }) => (
  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 via-fuchsia-500 to-purple-500 text-sm font-semibold text-white shadow-sm">
    {initial || 'A'}
  </div>
)

const BackIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="m15 5-7 7 7 7" />
  </svg>
)

const DotsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <circle cx="5" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="19" cy="12" r="1.5" />
  </svg>
)

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

const SettleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="4" y="5" width="16" height="14" rx="2" />
    <path d="M8 9h8M8 13h5" />
  </svg>
)
