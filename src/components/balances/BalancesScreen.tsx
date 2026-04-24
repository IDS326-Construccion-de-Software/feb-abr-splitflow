import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../common/LoadingSpinner'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { useUserExpenses } from '../../features/expenses/hooks/useUserExpenses'
import { useUserSettlements } from '../../features/settlements/hooks/useUserSettlements'
import {
  computeGroupNetBalances,
  convertAmount,
  formatCurrency,
  normalizeCurrency,
  simplifyTransfers,
  type Transfer,
} from '../../lib/utils/calculations'
import { getUsersByIds } from '../../features/users/services/userService'
import type { UserProfile } from '../../types/user'
import type { Expense } from '../../types/expense'
import type { Settlement } from '../../types/settlement'
import { navigateBack } from '../../lib/utils/navigation'
import UserAvatar from '../common/UserAvatar'

const BalancesScreen = () => {
  const { profile, user } = useAuth()
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
  const displayCurrency = normalizeCurrency(profile?.currency)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const ids = new Set<string>()
      userExpenses.forEach((expense) => {
        expense.participantIds?.forEach((id) => ids.add(id))
        if (expense.paidBy) ids.add(expense.paidBy)
      })
      userSettlements.forEach((settlement) => {
        if (settlement.fromUserId) ids.add(settlement.fromUserId)
        if (settlement.toUserId) ids.add(settlement.toUserId)
      })
      if (ids.size === 0) return

      setPeopleLoading(true)
      try {
        const list = await getUsersByIds(Array.from(ids))
        const map: Record<string, UserProfile> = {}
        list.forEach((item) => {
          map[item.uid] = item
        })
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

  const transfers = useMemo(() => {
    if (!user) return [] as UITransfer[]

    const groupIds = new Set<string>(['__no_group__'])
    userExpenses.forEach((expense) => groupIds.add(expense.groupId || '__no_group__'))
    userSettlements.forEach((settlement) => groupIds.add(settlement.groupId || '__no_group__'))

    const list: UITransfer[] = []

    groupIds.forEach((groupId) => {
      const gExpenses =
        groupId === '__no_group__'
          ? userExpenses.filter((expense) => !expense.groupId)
          : userExpenses.filter((expense) => expense.groupId === groupId)
      const gSettlements =
        groupId === '__no_group__'
          ? userSettlements.filter((settlement) => !settlement.groupId)
          : userSettlements.filter((settlement) => settlement.groupId === groupId)

      const net = computeGroupNetBalances(gExpenses, gSettlements, undefined, displayCurrency)
      const groupTransfers = simplifyTransfers(net).map((transfer) => ({
        ...transfer,
        groupId: groupId === '__no_group__' ? undefined : groupId,
      }))

      list.push(...groupTransfers)
    })

    return list.filter((transfer) => transfer.from === user.uid || transfer.to === user.uid)
  }, [displayCurrency, user, userExpenses, userSettlements])

  const owedToMe = transfers.filter((transfer) => user && transfer.to === user.uid)
  const iOwe = transfers.filter((transfer) => user && transfer.from === user.uid)

  const totalOwed = owedToMe.reduce((sum, transfer) => sum + transfer.amount, 0)
  const totalIOwe = iOwe.reduce((sum, transfer) => sum + transfer.amount, 0)
  const paymentHistory = useMemo(
    () => [...userSettlements].sort((a, b) => getSettlementSortValue(b) - getSettlementSortValue(a)),
    [userSettlements],
  )

  const renderTransfers = (list: UITransfer[], positive: boolean) => {
    if (list.length === 0) {
      return (
        <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
          Sin registros por ahora.
        </div>
      )
    }

    return list.map((transfer, idx) => {
      const counterpartId = positive ? transfer.from : transfer.to
      const person = people[counterpartId]
      const name = person?.displayName || person?.email || counterpartId
      const email = person?.email || ''

      return (
        <div
          key={`${transfer.from}-${transfer.to}-${transfer.groupId || 'nogroup'}-${idx}`}
          className="flex items-center gap-3 rounded-[1.5rem] border border-white/80 bg-white/[0.95] px-4 py-4 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.65)]"
        >
          <UserAvatar name={name} photoURL={person?.photoURL} size="md" tone={positive ? 'teal' : 'pink'} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {transfer.groupId ? 'Con grupo' : 'Sin grupo'}
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-slate-500">{email || 'Usuario sin correo visible'}</p>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className={`text-sm font-semibold ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {positive ? '+' : '-'}{formatCurrency(transfer.amount, displayCurrency)}
            </span>
            {!positive && (
              <button
                onClick={() => {
                  const groupId = transfer.groupId || guessGroupIdForPair(transfer.from, transfer.to, userExpenses, userSettlements)
                  const params = new URLSearchParams()
                  params.set('to', transfer.to)
                  params.set('amount', transfer.amount.toString())
                  if (groupId) params.set('groupId', groupId)
                  navigate(`/settle-up?${params.toString()}`)
                }}
                className="mt-1 text-xs font-semibold text-emerald-600 hover:underline"
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
    <div className="min-h-screen pb-24">
      <div className="relative overflow-hidden rounded-b-[2.2rem] bg-slate-950 text-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.9)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.18),transparent_30%)]" />
        <div className="relative mx-auto max-w-5xl px-4 pb-8 pt-5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateBack(navigate, '/dashboard')}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15"
              aria-label="Volver"
            >
              <BackIcon />
            </button>
            <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-100">
              Saldos
            </span>
            <span className="h-11 w-11" />
          </div>

          <div className="mt-6 max-w-2xl">
            <h1 className="text-3xl font-semibold leading-tight sm:text-[2.3rem]">Tus balances, claros y separados</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Aquí ves quién te debe, qué te falta por pagar y el historial de pagos manuales registrados.
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <HeroMetric label="Te deben" value={formatCurrency(totalOwed, displayCurrency)} helper={`${owedToMe.length} registros abiertos`} />
            <HeroMetric label="Debes" value={formatCurrency(totalIOwe, displayCurrency)} helper={`${iOwe.length} pendientes por liquidar`} />
            <HeroMetric label="Pagos manuales" value={paymentHistory.length.toString()} helper="Movimientos ya registrados" />
          </div>
        </div>
      </div>

      <main className="mx-auto mt-6 flex max-w-5xl flex-col gap-5 px-4">
        {isLoading && <LoadingSpinner label="Calculando saldos..." />}

        {errorMsg && (
          <div className="rounded-[1.6rem] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.45)]">
            {errorMsg}
          </div>
        )}

        {!isLoading && !errorMsg && (
          <>
            <SectionCard
              eyebrow="A favor"
              title="Te deben"
              meta={`${owedToMe.length} registros`}
              description="Montos donde tú quedaste como acreedor."
            >
              {renderTransfers(owedToMe, true)}
            </SectionCard>

            <SectionCard
              eyebrow="Pendiente"
              title="Debes"
              meta={`${iOwe.length} registros`}
              description="Saldos que puedes liquidar manualmente desde aquí."
            >
              {renderTransfers(iOwe, false)}
            </SectionCard>

            <SectionCard
              eyebrow="Historial"
              title="Pagos manuales"
              meta={`${paymentHistory.length} movimientos`}
              description="Registro de pagos enviados y recibidos."
            >
              {paymentHistory.length === 0 && (
                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  Aún no has registrado pagos manuales.
                </div>
              )}

              {paymentHistory.map((settlement) => {
                const sentByMe = user ? settlement.fromUserId === user.uid : false
                const counterpartId = sentByMe ? settlement.toUserId : settlement.fromUserId
                const person = people[counterpartId]
                const name = person?.displayName || person?.email || counterpartId
                const email = person?.email || ''
                const displayAmount = convertAmount(settlement.amount, settlement.currency, displayCurrency)

                return (
                  <div
                    key={settlement.id}
                    className="flex items-start gap-3 rounded-[1.5rem] border border-white/80 bg-white/[0.95] px-4 py-4 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.65)]"
                  >
                    <UserAvatar name={name} photoURL={person?.photoURL} size="md" tone={sentByMe ? 'pink' : 'teal'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {sentByMe ? 'Pagaste a' : 'Recibiste de'} {name}
                        </p>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {settlement.groupId ? 'Con grupo' : 'Sin grupo'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatSettlementDate(settlement)}
                        {email ? ` · ${email}` : ''}
                      </p>
                      {settlement.note && <p className="mt-2 text-xs leading-5 text-slate-600">{settlement.note}</p>}
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${sentByMe ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {sentByMe ? '-' : '+'}{formatCurrency(displayAmount, displayCurrency)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </SectionCard>
          </>
        )}
      </main>
    </div>
  )
}

const guessGroupIdForPair = (from: string, to: string, expenses: Expense[], settlements: Settlement[]): string | null => {
  const expense = expenses.find((item) => item.groupId && item.participantIds?.includes(from) && item.participantIds?.includes(to))
  if (expense?.groupId) return expense.groupId

  const settlement = settlements.find(
    (item) =>
      item.groupId &&
      ((item.fromUserId === from && item.toUserId === to) || (item.fromUserId === to && item.toUserId === from)),
  )
  return settlement?.groupId || null
}

const SectionCard = ({
  eyebrow,
  title,
  meta,
  description,
  children,
}: {
  eyebrow: string
  title: string
  meta: string
  description: string
  children: ReactNode
}) => (
  <section className="rounded-[2rem] border border-white/80 bg-white/[0.88] p-5 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{meta}</span>
    </div>
    <div className="mt-4 space-y-3">{children}</div>
  </section>
)

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

const getSettlementSortValue = (settlement: Settlement) => {
  if (settlement.date) {
    const parsed = Date.parse(`${settlement.date}T00:00:00`)
    if (!Number.isNaN(parsed)) return parsed
  }

  return settlement.createdAt?.toDate().getTime() || 0
}

const formatSettlementDate = (settlement: Settlement) => {
  if (settlement.date) {
    const parsed = new Date(`${settlement.date}T00:00:00`)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('es-DO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    }
  }

  if (settlement.createdAt) {
    return settlement.createdAt.toDate().toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return 'Sin fecha'
}

export default BalancesScreen
