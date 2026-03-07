import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../common/LoadingSpinner'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { useUserExpenses } from '../../features/expenses/hooks/useUserExpenses'
import { useUserSettlements } from '../../features/settlements/hooks/useUserSettlements'
import { computeGroupNetBalances, simplifyTransfers, type Transfer } from '../../lib/utils/calculations'
import { getUsersByIds } from '../../features/users/services/userService'
import type { UserProfile } from '../../types/user'
import type { Expense } from '../../types/expense'
import type { Settlement } from '../../types/settlement'

const BalancesScreen = () => {
  const { user } = useAuth()
  const { expenses: userExpenses, loading: expLoading, error: expError } = useUserExpenses(user?.uid)
  const {
    settlements: userSettlements,
    loading: setLoading,
    error: setError,
  } = useUserSettlements(user?.uid)
  const [people, setPeople] = useState<Record<string, UserProfile>>({})
  const [peopleLoading, setPeopleLoading] = useState(false)
  const [peopleError, setPeopleError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const ids = new Set<string>()
      userExpenses.forEach((e) => {
        e.participantIds?.forEach((id) => ids.add(id))
        if (e.paidBy) ids.add(e.paidBy)
      })
      userSettlements.forEach((s) => {
        if (s.fromUserId) ids.add(s.fromUserId)
        if (s.toUserId) ids.add(s.toUserId)
      })
      if (ids.size === 0) return
      setPeopleLoading(true)
      try {
        const list = await getUsersByIds(Array.from(ids))
        const map: Record<string, UserProfile> = {}
        list.forEach((u) => (map[u.uid] = u))
        setPeople(map)
      } catch (err) {
        console.error('No se pudieron cargar perfiles', err)
        setPeopleError('No pudimos cargar nombres de usuarios.')
      } finally {
        setPeopleLoading(false)
      }
    }
    load()
  }, [user, userExpenses, userSettlements])

  const isLoading = !user || expLoading || setLoading || peopleLoading
  const errorMsg = expError || setError || peopleError

  type UITransfer = Transfer & { groupId?: string }

  // Calcular transferencias por grupo para evitar que se compensen entre grupos distintos
  const transfers = useMemo(() => {
    if (!user) return [] as UITransfer[]

    const groupIds = new Set<string>(['__no_group__'])
    userExpenses.forEach((e) => groupIds.add(e.groupId || '__no_group__'))
    userSettlements.forEach((s) => groupIds.add(s.groupId || '__no_group__'))

    const list: UITransfer[] = []

    groupIds.forEach((gid) => {
      const gExpenses =
        gid === '__no_group__'
          ? userExpenses.filter((e) => !e.groupId)
          : userExpenses.filter((e) => e.groupId === gid)
      const gSettlements =
        gid === '__no_group__'
          ? userSettlements.filter((s) => !s.groupId)
          : userSettlements.filter((s) => s.groupId === gid)
      const net = computeGroupNetBalances(gExpenses, gSettlements)
      const groupTransfers = simplifyTransfers(net).map((t) => ({ ...t, groupId: gid === '__no_group__' ? undefined : gid }))
      list.push(...groupTransfers)
    })

    // Solo nos interesan transferencias donde participe el usuario
    return list.filter((t) => t.from === user.uid || t.to === user.uid)
  }, [user, userExpenses, userSettlements])

  const owedToMe = transfers.filter((t) => user && t.to === user.uid)
  const iOwe = transfers.filter((t) => user && t.from === user.uid)

  const totalOwed = owedToMe.reduce((sum, t) => sum + t.amount, 0)
  const totalIOwe = iOwe.reduce((sum, t) => sum + t.amount, 0)

  const renderList = (list: UITransfer[], positive: boolean) => {
    if (list.length === 0) {
      return <p className="px-4 py-3 text-sm text-slate-600">Sin registros.</p>
    }
    return list.map((t, idx) => {
      const counterpartId = positive ? t.from : t.to
      const person = people[counterpartId]
      const name = person?.displayName || person?.email || counterpartId
      const email = person?.email || ''
      const initial = name.trim().charAt(0).toUpperCase()
      return (
        <div
          key={`${t.from}-${t.to}-${t.groupId || 'nogroup'}-${idx}`}
          className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm shadow-slate-200/60"
        >
          <Avatar initial={initial} tone={positive ? 'teal' : 'pink'} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">{name}</p>
            <p className="text-xs text-slate-600">{email}</p>
          </div>
          <div className="flex flex-col items-end text-sm font-semibold">
            <span className={positive ? 'text-emerald-600' : 'text-rose-600'}>
              {positive ? '+' : '-'}RD${t.amount.toFixed(2)}
            </span>
            {!positive && (
              <button
                onClick={() => {
                  const groupId = t.groupId || guessGroupIdForPair(t.from, t.to, userExpenses, userSettlements)
                  const params = new URLSearchParams()
                  params.set('to', t.to)
                  params.set('amount', t.amount.toString())
                  if (groupId) params.set('groupId', groupId)
                  navigate(`/settle-up?${params.toString()}`)
                }}
                className="text-xs font-semibold text-emerald-600 hover:underline"
              >
                Liquidar
              </button>
            )}
          </div>
        </div>
      )
    })
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] pb-24">
      <div className="bg-gradient-to-r from-teal-500 to-sky-500 text-white shadow-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15"
            aria-label="Volver"
          >
            <BackIcon />
          </button>
          <h1 className="text-lg font-semibold">Tus Saldos</h1>
          <span className="h-10 w-10" />
        </div>
        <div className="mx-auto grid max-w-5xl gap-3 px-4 pb-6 sm:grid-cols-2">
          <SummaryCard label="Te deben en total" amount={totalOwed} tone="emerald" />
          <SummaryCard label="Debes en total" amount={totalIOwe} tone="blue" />
        </div>
      </div>

      <main className="mx-auto mt-4 flex max-w-5xl flex-col gap-5 px-4">
        {isLoading && <LoadingSpinner label="Calculando saldos..." />}
        {errorMsg && (
          <div className="rounded-2xl bg-white px-4 py-3 text-sm text-red-600 shadow-sm shadow-slate-200/60">
            {errorMsg}
          </div>
        )}
        {!isLoading && !errorMsg && (
          <>
            <section className="space-y-2">
              <p className="text-sm font-semibold text-slate-800">Te deben</p>
              {renderList(owedToMe, true)}
            </section>

            <section className="space-y-2">
              <p className="text-sm font-semibold text-slate-800">Debes</p>
              {renderList(iOwe, false)}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

// Heurística simple: tomar el primer groupId encontrado en gastos o settlements entre dos usuarios
const guessGroupIdForPair = (
  from: string,
  to: string,
  expenses: Expense[],
  settlements: Settlement[],
): string | null => {
  const exp = expenses.find(
    (e) => e.groupId && e.participantIds?.includes(from) && e.participantIds?.includes(to),
  )
  if (exp?.groupId) return exp.groupId
  const set = settlements.find((s) => s.groupId && ((s.fromUserId === from && s.toUserId === to) || (s.fromUserId === to && s.toUserId === from)))
  return set?.groupId || null
}

const SummaryCard = ({
  label,
  amount,
  tone,
}: {
  label: string
  amount: number
  tone: 'emerald' | 'blue'
}) => {
  const toneClass =
    tone === 'emerald'
      ? 'from-emerald-400 to-teal-500'
      : 'from-sky-500 to-blue-500'
  return (
    <div className={`rounded-2xl bg-gradient-to-r ${toneClass} px-4 py-4 text-white shadow-card`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-white/90">{label}</p>
      <p className="text-2xl font-bold leading-tight">RD${amount.toFixed(2)}</p>
    </div>
  )
}

const Avatar = ({ initial, tone }: { initial: string; tone: 'teal' | 'pink' }) => {
  const palette =
    tone === 'teal'
      ? 'from-emerald-400 via-teal-500 to-emerald-500 text-white'
      : 'from-pink-400 via-rose-500 to-pink-500 text-white'
  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${palette} text-sm font-semibold shadow-sm`}
    >
      {initial || 'A'}
    </div>
  )
}

const BackIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="m15 5-7 7 7 7" />
  </svg>
)

export default BalancesScreen
