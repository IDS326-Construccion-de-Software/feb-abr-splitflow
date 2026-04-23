import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import LoadingSpinner from '../common/LoadingSpinner'
import { useGroup } from '../../features/groups/hooks/useGroup'
import { getUsersByIds } from '../../features/users/services/userService'
import type { UserProfile } from '../../types/user'
import type { Expense } from '../../types/expense'
import type { Settlement } from '../../types/settlement'
import { useGroupExpenses } from '../../features/expenses/hooks/useGroupExpenses'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { computeGroupNetBalances, convertAmount, formatCurrency, normalizeCurrency } from '../../lib/utils/calculations'
import { listenGroupSettlements } from '../../features/settlements/services/settlementService'
import { navigateBack } from '../../lib/utils/navigation'
import UserAvatar from '../common/UserAvatar'

const GroupDetail = () => {
  const { groupId } = useParams<{ groupId: string }>()
  const { group, loading } = useGroup(groupId)
  const [members, setMembers] = useState<UserProfile[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const { expenses, loading: expensesLoading } = useGroupExpenses(groupId)
  const { profile, user } = useAuth()
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const navigate = useNavigate()
  const displayCurrency = normalizeCurrency(profile?.currency)

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

  const netBalances = useMemo(
    () => computeGroupNetBalances(expenses, settlements, undefined, displayCurrency),
    [displayCurrency, expenses, settlements],
  )
  const myNet = user ? netBalances[user.uid] || 0 : 0
  const totalSpent = useMemo(
    () =>
      round2(
        expenses.reduce((sum, expense) => sum + convertAmount(expense.amount, expense.currency, displayCurrency), 0),
      ),
    [displayCurrency, expenses],
  )
  const totalSettled = useMemo(
    () =>
      round2(
        settlements.reduce(
          (sum, settlement) => sum + convertAmount(settlement.amount, settlement.currency, displayCurrency),
          0,
        ),
      ),
    [displayCurrency, settlements],
  )

  if (loading) return <LoadingSpinner label="Cargando grupo..." />

  if (!group) {
    return (
      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-4 pb-24 pt-12">
        <div className="w-full rounded-[2rem] border border-white/80 bg-white/[0.9] p-6 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Grupo</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">No pudimos encontrar este grupo</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Puede que ya no exista, que no tengas acceso o que el enlace haya cambiado.
          </p>
          <Link
            to="/groups"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <BackIcon />
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
    <div className="min-h-screen pb-24">
      <header className="relative overflow-hidden rounded-b-[2.2rem] bg-slate-950 text-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.9)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.18),transparent_30%)]" />
        <div className="relative mx-auto max-w-5xl px-4 pb-8 pt-5">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => navigateBack(navigate, '/groups')}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15"
              aria-label="Volver"
            >
              <BackIcon />
            </button>
            <Link
              to={`/groups/${group.id}/expenses/new`}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:brightness-105"
            >
              <PlusIcon />
              Nuevo gasto
            </Link>
          </div>

          <div className="mt-6 max-w-3xl">
            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-100">
              Grupo activo
            </span>
            <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-[2.35rem]">{group.name}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {group.description || 'Un espacio compartido para seguir gastos, saldos y pagos del grupo.'}
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <HeroMetric label="Miembros" value={group.memberIds.length.toString()} helper="Personas activas en este grupo" />
            <HeroMetric label="Gastos" value={expenses.length.toString()} helper="Movimientos registrados" />
            <HeroMetric label="Total movido" value={formatCurrency(totalSpent, displayCurrency)} helper="Monto acumulado del grupo" />
          </div>
        </div>
      </header>

      <main className="mx-auto mt-6 flex max-w-5xl flex-col gap-5 px-4">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
          <div className="rounded-[2rem] border border-white/80 bg-white/[0.9] p-5 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Tu posicion</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  {myNet >= 0 ? 'Vas a favor en este grupo' : 'Tienes saldo pendiente'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {myNet >= 0
                    ? 'Tu balance actual esta positivo. Aun puedes revisar quien te debe antes de liquidar.'
                    : 'Tu balance actual esta negativo. Puedes registrar un pago manual cuando quieras.'}
                </p>
              </div>
              <div className="rounded-[1.6rem] bg-slate-950 px-5 py-4 text-right text-white shadow-[0_24px_70px_-55px_rgba(15,23,42,0.75)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Balance</p>
                <p className={`mt-2 text-3xl font-semibold ${myNet >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {myNet >= 0 ? '+' : '-'}
                  {formatCurrency(myNet, displayCurrency)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MiniStat label="Te deben / debes" value={formatCurrency(myNet, displayCurrency)} tone={myNet >= 0 ? 'teal' : 'rose'} />
              <MiniStat label="Pagos registrados" value={formatCurrency(totalSettled, displayCurrency)} tone="sky" />
              <MiniStat label="Miembros visibles" value={memberList.length.toString()} tone="slate" />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to={`/groups/${group.id}/expenses/new`}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              >
                <PlusIcon />
                Agregar gasto
              </Link>
              <button
                onClick={() => navigate(`/settle-up?groupId=${group.id}`)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <SettleIcon />
                Liquidar saldo
              </button>
            </div>
          </div>

          <section className="rounded-[2rem] border border-white/80 bg-white/[0.9] p-5 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Resumen rapido</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Estado del grupo</h2>
            <div className="mt-4 space-y-3">
              <InsightRow label="Miembros" value={`${group.memberIds.length} activos`} />
              <InsightRow label="Gastos" value={`${expenses.length} registrados`} />
              <InsightRow label="Pagos manuales" value={`${settlements.length} movimientos`} />
              <InsightRow label="Cargando miembros" value={loadingMembers ? 'Si' : 'No'} />
            </div>
          </section>
        </section>

        <SectionCard
          eyebrow="Miembros"
          title="Balances por persona"
          meta={`${memberList.length} perfiles`}
          description="Revisa quien esta a favor o pendiente dentro del grupo."
        >
          {!loadingMembers && memberList.length === 0 && (
            <EmptyState
              title="Todavia no vemos miembros"
              description="Cuando haya perfiles disponibles, apareceran aqui con su balance actual."
            />
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {memberList.map((member) => {
              const amount = netBalances[member.uid] || 0
              const positive = amount >= 0
              const name = user && member.uid === user.uid ? 'Tu' : member.displayName || member.email || member.uid

              return (
                <div
                  key={member.uid}
                  className={`rounded-[1.6rem] border px-4 py-4 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.65)] ${
                    positive
                      ? 'border-emerald-100 bg-[linear-gradient(135deg,#f8fffc_0%,#ffffff_55%)]'
                      : 'border-rose-100 bg-[linear-gradient(135deg,#fff8f8_0%,#ffffff_55%)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar name={name} photoURL={member.photoURL} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                      <p className="truncate text-xs text-slate-500">{member.email || member.uid}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                        positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {positive ? 'A favor' : 'Pendiente'}
                    </span>
                  </div>
                  <p className={`mt-4 text-2xl font-semibold ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {positive ? '+' : '-'}
                    {formatCurrency(amount, displayCurrency)}
                  </p>
                </div>
              )
            })}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Movimientos"
          title="Gastos registrados"
          meta={`${expenses.length} items`}
          description="Cada movimiento muestra quien pago, cuanto fue y tu participacion dentro del gasto."
        >
          {expensesLoading && <LoadingSpinner label="Cargando gastos..." />}

          {!expensesLoading && expenses.length === 0 && (
            <EmptyState
              title="Todavia no hay gastos"
              description="Agrega el primer gasto del grupo para empezar a repartir balances."
              action={
                <Link
                  to={`/groups/${group.id}/expenses/new`}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  <PlusIcon />
                  Agregar gasto
                </Link>
              }
            />
          )}

          <div className="space-y-3">
            {expenses.map((expense) => {
              const amount = convertAmount(expense.amount, expense.currency, displayCurrency)
              const myShare = user ? convertAmount(getUserShare(expense, user.uid), expense.currency, displayCurrency) : 0

              return (
                <Link
                  key={expense.id}
                  to={`/expenses/${expense.id}`}
                  className="group flex items-center gap-4 rounded-[1.6rem] border border-white/80 bg-white/[0.95] px-4 py-4 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.65)] transition hover:-translate-y-0.5"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
                    <ReceiptIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{expense.description}</p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        {expense.date}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Pagado por {memberList.find((member) => member.uid === expense.paidBy)?.displayName || 'alguien'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(amount, displayCurrency)}</p>
                    {user && (
                      <p className="mt-1 text-xs text-slate-500">
                        Tu parte: {formatCurrency(myShare, displayCurrency)}
                      </p>
                    )}
                  </div>
                  <ArrowRightIcon />
                </Link>
              )
            })}
          </div>
        </SectionCard>
      </main>
    </div>
  )
}

export default GroupDetail

const getUserShare = (expense: Expense, uid: string) => {
  const split = expense.splits.find((item) => item.uid === uid)
  return split ? Number(split.amount || 0) : 0
}

const round2 = (n: number) => Math.round(n * 100) / 100

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
  <section className="rounded-[2rem] border border-white/80 bg-white/[0.9] p-5 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
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

const EmptyState = ({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) => (
  <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-5 text-sm text-slate-600">
    <p className="font-semibold text-slate-900">{title}</p>
    <p className="mt-1 leading-6">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
)

const HeroMetric = ({ label, value, helper }: { label: string; value: string; helper: string }) => (
  <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.06] px-4 py-4 backdrop-blur-sm">
    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300">{label}</p>
    <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    <p className="mt-1 text-xs leading-5 text-slate-300">{helper}</p>
  </div>
)

const MiniStat = ({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'teal' | 'rose' | 'sky' | 'slate'
}) => {
  const palette = {
    teal: 'from-emerald-50 to-teal-50 text-emerald-700',
    rose: 'from-rose-50 to-pink-50 text-rose-700',
    sky: 'from-sky-50 to-cyan-50 text-sky-700',
    slate: 'from-slate-100 to-slate-50 text-slate-700',
  }

  return (
    <div className={`rounded-[1.4rem] bg-gradient-to-r ${palette[tone]} px-4 py-4`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-75">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  )
}

const InsightRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between rounded-[1.35rem] bg-slate-50 px-4 py-3">
    <span className="text-sm font-medium text-slate-600">{label}</span>
    <span className="text-sm font-semibold text-slate-900">{value}</span>
  </div>
)

const BackIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="m15 5-7 7 7 7" />
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

const ReceiptIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 4.5h10a2 2 0 0 1 2 2V20l-3-1.5L13 20l-3-1.5L7 20V6.5a2 2 0 0 1 2-2Z" />
    <path d="M9.5 9.5h5M9.5 13h5" />
  </svg>
)

const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
)
