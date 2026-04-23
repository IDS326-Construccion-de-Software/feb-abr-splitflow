import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import LoadingSpinner from '../common/LoadingSpinner'
import { useExpense } from '../../features/expenses/hooks/useExpense'
import { getUsersByIds } from '../../features/users/services/userService'
import type { UserProfile } from '../../types/user'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { deleteExpense } from '../../features/expenses/services/expenseService'
import { logActivity } from '../../features/activity/services/activityService'
import { navigateBack } from '../../lib/utils/navigation'
import UserAvatar from '../common/UserAvatar'
import { convertAmount, formatCurrency, normalizeCurrency } from '../../lib/utils/calculations'

const ExpenseDetail = () => {
  const { expenseId } = useParams<{ expenseId: string }>()
  const { expense, loading } = useExpense(expenseId)
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [actionError, setActionError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const displayCurrency = normalizeCurrency(profile?.currency)

  useEffect(() => {
    const load = async () => {
      if (!expense) return
      const ids = Array.from(new Set([expense.paidBy, ...expense.participantIds]))
      try {
        const list = await getUsersByIds(ids)
        setUsers(list)
      } catch (err) {
        console.error('No se pudieron cargar usuarios, usando IDs', err)
        setUsers(ids.map((uid) => ({ uid, email: uid, displayName: uid } as UserProfile)))
      }
    }

    load()
  }, [expense])

  const canDelete = Boolean(user && expense && user.uid === expense.createdBy)
  const participantCount = expense?.participantIds.length || 0
  const totalSplit = useMemo(
    () => {
      if (!expense) return 0
      return round2(
        expense.splits.reduce((sum, split) => sum + convertAmount(split.amount, expense.currency, displayCurrency), 0),
      )
    },
    [displayCurrency, expense],
  )

  if (loading) return <LoadingSpinner label="Cargando gasto..." />

  if (!expense) {
    return (
      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-4 pb-24 pt-12">
        <div className="w-full rounded-[2rem] border border-white/80 bg-white/[0.9] p-6 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Gasto</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">No pudimos cargar este gasto</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Puede que haya sido eliminado o que el enlace ya no sea valido.
          </p>
          <Link
            to="/groups"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <BackIcon />
            Volver
          </Link>
        </div>
      </div>
    )
  }

  const userProfile = (uid: string) => users.find((item) => item.uid === uid)
  const userLabel = (uid: string) => {
    const profile = userProfile(uid)
    return profile?.displayName || profile?.email || uid
  }
  const displayExpenseAmount = convertAmount(expense.amount, expense.currency, displayCurrency)

  const handleDelete = async () => {
    if (!user || user.uid !== expense.createdBy || isDeleting) return

    const confirmed = window.confirm('Quieres eliminar este gasto? Esta accion no se puede deshacer.')
    if (!confirmed) return

    try {
      setActionError(null)
      setIsDeleting(true)
      await deleteExpense(expense.id)

      try {
        await logActivity({
          entityType: 'expense',
          entityId: expense.id,
          groupId: expense.groupId,
          action: 'delete',
          actorUid: user.uid,
          meta: {
            description: expense.description,
            amount: expense.amount,
          },
        })
      } catch (logError) {
        console.error('No se pudo registrar la actividad del borrado', logError)
      }

      navigate(`/groups/${expense.groupId}`, { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos eliminar el gasto.'
      setActionError(message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="relative overflow-hidden rounded-b-[2.2rem] bg-slate-950 text-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.9)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.18),transparent_30%)]" />
        <div className="relative mx-auto max-w-5xl px-4 pb-8 pt-5">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => navigateBack(navigate, `/groups/${expense.groupId}`)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15"
              aria-label="Volver"
            >
              <BackIcon />
            </button>
            <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-100">
              Detalle del gasto
            </span>
          </div>

          <div className="mt-6 max-w-3xl">
            <h1 className="text-3xl font-semibold leading-tight sm:text-[2.35rem]">{expense.description}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Pagado por {userLabel(expense.paidBy)} el {formatExpenseDate(expense.date)} con una division{' '}
              {expense.splitType === 'equal' ? 'igualitaria' : 'personalizada'}.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <HeroMetric label="Monto total" value={formatCurrency(displayExpenseAmount, displayCurrency)} helper="Importe registrado" />
            <HeroMetric label="Participantes" value={participantCount.toString()} helper="Personas incluidas" />
            <HeroMetric label="Splits" value={formatCurrency(totalSplit, displayCurrency)} helper="Suma del reparto" />
          </div>
        </div>
      </header>

      <main className="mx-auto mt-6 grid max-w-5xl gap-5 px-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          {actionError && (
            <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
              {actionError}
            </div>
          )}

          <SectionCard
            eyebrow="Resumen"
            title="Lectura rapida"
            meta={expense.splitType === 'equal' ? 'Division igual' : 'Division personalizada'}
            description="Este bloque resume quien pago, cuanto se registro y desde cuando existe el gasto."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile label="Pagado por" value={userLabel(expense.paidBy)} />
              <InfoTile label="Fecha" value={formatExpenseDate(expense.date)} />
              <InfoTile label="Moneda" value={displayCurrency} />
              <InfoTile label="Creado por" value={userLabel(expense.createdBy)} />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Participacion"
            title="Personas incluidas"
            meta={`${participantCount} perfiles`}
            description="Todos los usuarios que entran en el gasto aparecen aqui con su identificador visible."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {expense.participantIds.map((uid) => {
                const profile = userProfile(uid)

                return (
                  <PersonCard
                    key={uid}
                    name={userLabel(uid)}
                    email={profile?.email || uid}
                    photoURL={profile?.photoURL}
                  />
                )
              })}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Reparto"
            title="Splits del gasto"
            meta={`${expense.splits.length} lineas`}
            description="Cada linea muestra la parte exacta asignada a cada participante."
          >
            <div className="space-y-3">
              {expense.splits.map((split) => {
                const profile = userProfile(split.uid)
                const name = userLabel(split.uid)

                return (
                  <div
                    key={split.uid}
                    className="flex items-center justify-between gap-3 rounded-[1.5rem] border border-white/80 bg-white/[0.95] px-4 py-4 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.65)]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar name={name} photoURL={profile?.photoURL} size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                        <p className="mt-1 text-xs text-slate-500">Participacion dentro del gasto</p>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-slate-900">
                      {formatCurrency(convertAmount(split.amount, expense.currency, displayCurrency), displayCurrency)}
                    </p>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-4">
          <section className="rounded-[2rem] border border-white/80 bg-white/[0.9] p-5 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Acciones</p>
            <div className="mt-4 space-y-3">
              <Link
                to={`/groups/${expense.groupId}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              >
                <BackIcon />
                Volver al grupo
              </Link>
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <TrashIcon />
                  {isDeleting ? 'Eliminando...' : 'Eliminar gasto'}
                </button>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/80 bg-white/[0.9] p-5 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Estado del registro</p>
            <div className="mt-4 space-y-3">
              <StatusRow label="Monto" value={formatCurrency(displayExpenseAmount, displayCurrency)} />
              <StatusRow label="Split type" value={expense.splitType} />
              <StatusRow label="Participantes" value={participantCount.toString()} />
              <StatusRow label="Fecha" value={formatExpenseDate(expense.date)} />
            </div>
          </section>
        </aside>
      </main>
    </div>
  )
}

export default ExpenseDetail

const round2 = (n: number) => Math.round(n * 100) / 100

const formatExpenseDate = (date: string) => {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date

  return parsed.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
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
  <section className="rounded-[2rem] border border-white/80 bg-white/[0.9] p-5 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{meta}</span>
    </div>
    <div className="mt-4">{children}</div>
  </section>
)

const PersonCard = ({ name, email, photoURL }: { name: string; email: string; photoURL?: string | null }) => (
  <div className="flex items-center gap-3 rounded-[1.5rem] border border-white/80 bg-white/[0.95] px-4 py-4 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.65)]">
    <UserAvatar name={name} photoURL={photoURL} size="md" />
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{email}</p>
    </div>
  </div>
)

const InfoTile = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-[1.5rem] bg-slate-50 px-4 py-4">
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
  </div>
)

const StatusRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between rounded-[1.35rem] bg-slate-50 px-4 py-3">
    <span className="text-sm text-slate-600">{label}</span>
    <span className="text-sm font-semibold text-slate-900">{value}</span>
  </div>
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

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16" />
    <path d="m10 11 .5 6M14 11l-.5 6" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
  </svg>
)
