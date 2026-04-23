import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import LoadingSpinner from '../common/LoadingSpinner'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { useUserExpenses } from '../../features/expenses/hooks/useUserExpenses'
import { useUserSettlements } from '../../features/settlements/hooks/useUserSettlements'
import { computeGroupNetBalances, formatCurrency, getCurrencySymbol, normalizeCurrency, simplifyTransfers } from '../../lib/utils/calculations'
import { createSettlement } from '../../features/settlements/services/settlementService'
import { logActivity } from '../../features/activity/services/activityService'
import { getUsersByIds } from '../../features/users/services/userService'
import type { UserProfile } from '../../types/user'
import { navigateBack } from '../../lib/utils/navigation'
import UserAvatar from '../common/UserAvatar'

type SettleForm = {
  amount: number
  date: string
  note?: string
  toUserId?: string
  groupId?: string
}

type Debt = { to: string; amount: number; groupId?: string }

const SettleUpScreen = () => {
  const { profile, user } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [members, setMembers] = useState<Array<{ uid: string; label: string; photoURL?: string | null }>>([])
  const { expenses, loading: expLoading } = useUserExpenses(user?.uid)
  const { settlements, loading: setLoading } = useUserSettlements(user?.uid)
  const displayCurrency = normalizeCurrency(profile?.currency)
  const currencySymbol = getCurrencySymbol(displayCurrency)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SettleForm>({
    defaultValues: {
      amount: round2(Number(searchParams.get('amount') || 0)),
      date: new Date().toISOString().substring(0, 10),
      note: '',
      toUserId: searchParams.get('to') || '',
      groupId: searchParams.get('groupId') || '',
    },
  })

  const selectedGroupId = watch('groupId')
  const toUserId = watch('toUserId')
  const amountValue = watch('amount')
  const noteValue = watch('note')
  const presetTo = searchParams.get('to') || ''
  const presetAmount = Number(searchParams.get('amount') || 0)

  const filteredExpenses = useMemo(
    () => (selectedGroupId ? expenses.filter((item) => item.groupId === selectedGroupId) : expenses),
    [expenses, selectedGroupId],
  )

  const filteredSettlements = useMemo(
    () => (selectedGroupId ? settlements.filter((item) => item.groupId === selectedGroupId) : settlements),
    [settlements, selectedGroupId],
  )

  const debts = useMemo<Debt[]>(() => {
    if (!user) return []
    const net = computeGroupNetBalances(filteredExpenses, filteredSettlements, undefined, displayCurrency)
    return simplifyTransfers(net)
      .filter((item) => item.from === user.uid)
      .map((item) => ({ to: item.to, amount: round2(item.amount), groupId: selectedGroupId || undefined }))
  }, [displayCurrency, filteredExpenses, filteredSettlements, selectedGroupId, user])

  const presetDebt = useMemo<Debt | null>(() => {
    if (presetTo && presetAmount > 0) {
      return { to: presetTo, amount: round2(presetAmount), groupId: selectedGroupId || undefined }
    }
    return null
  }, [presetAmount, presetTo, selectedGroupId])

  const displayDebts = useMemo(() => {
    if (presetDebt && !debts.find((item) => item.to === presetDebt.to)) {
      return [presetDebt, ...debts]
    }
    return debts
  }, [debts, presetDebt])

  const totalDue = useMemo(() => round2(displayDebts.reduce((sum, item) => sum + item.amount, 0)), [displayDebts])
  const selectedMember = members.find((member) => member.uid === toUserId)
  const selectedLabel = selectedMember?.label || toUserId || 'Nadie seleccionado'

  useEffect(() => {
    if (presetTo) setValue('toUserId', presetTo)
    if (presetAmount > 0) setValue('amount', round2(presetAmount))
  }, [presetAmount, presetTo, setValue])

  useEffect(() => {
    const loadMembers = async () => {
      const ids = new Set<string>()
      filteredExpenses.forEach((expense) => {
        expense.participantIds?.forEach((id) => ids.add(id))
        if (expense.paidBy) ids.add(expense.paidBy)
      })
      filteredSettlements.forEach((settlement) => {
        if (settlement.fromUserId) ids.add(settlement.fromUserId)
        if (settlement.toUserId) ids.add(settlement.toUserId)
      })
      if (presetDebt?.to) ids.add(presetDebt.to)

      if (ids.size === 0) {
        setMembers([])
        return
      }

      try {
        const list = await getUsersByIds(Array.from(ids))
        setMembers(
          list.map((item: UserProfile) => ({
            uid: item.uid,
            label: item.displayName || item.email || item.uid,
            photoURL: item.photoURL,
          })),
        )
      } catch (err) {
        console.error('No se pudieron cargar los miembros para liquidar', err)
        setMembers(Array.from(ids).map((uid) => ({ uid, label: uid })))
      }
    }

    loadMembers()
  }, [filteredExpenses, filteredSettlements, presetDebt])

  useEffect(() => {
    if (displayDebts.length > 0 && !toUserId) {
      setValue('toUserId', displayDebts[0].to)
      setValue('amount', round2(displayDebts[0].amount))
    }
  }, [displayDebts, toUserId, setValue])

  useEffect(() => {
    if (!toUserId) return
    const found = displayDebts.find((item) => item.to === toUserId)
    if (found) {
      setValue('amount', round2(found.amount))
    }
  }, [toUserId, displayDebts, setValue])

  const isLoading = expLoading || setLoading

  if (!user) return <LoadingSpinner label="Cargando sesion..." />
  if (isLoading) return <LoadingSpinner label="Preparando liquidacion..." />

  const onSubmit = handleSubmit(async (values) => {
    try {
      setError(null)
      const targetId = values.toUserId
      const target = members.find((member) => member.uid === targetId)
      const targetLabel = target?.label || targetId || ''

      if (!targetId) throw new Error('Selecciona a quien pagar.')
      if (targetId === user.uid) throw new Error('No puedes registrar un pago contigo mismo.')
      if (values.amount <= 0) throw new Error('El monto debe ser mayor a 0.')

      const normalizedAmount = round2(values.amount)
      const groupId = selectedGroupId?.trim() || undefined
      const note = values.note?.trim()

      const settlementId = await createSettlement({
        groupId,
        fromUserId: user.uid,
        toUserId: targetId,
        amount: normalizedAmount,
        currency: displayCurrency,
        date: values.date,
        note,
      })

      await logActivity({
        entityType: 'settlement',
        entityId: settlementId,
        groupId,
        action: 'create',
        actorUid: user.uid,
        meta: { amount: normalizedAmount, to: targetLabel },
      })

      navigate('/balances')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No pudimos registrar el pago.'
      setError(msg)
    }
  })

  return (
    <div className="min-h-screen pb-24">
      <header className="relative overflow-hidden rounded-b-[2.2rem] bg-slate-950 text-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.9)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.18),transparent_30%)]" />
        <div className="relative mx-auto max-w-5xl px-4 pb-8 pt-5">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => navigateBack(navigate, '/balances')}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15"
              aria-label="Volver"
            >
              <BackIcon />
            </button>
            <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-100">
              Liquidar saldo
            </span>
          </div>

          <div className="mt-6 max-w-3xl">
            <h1 className="text-3xl font-semibold leading-tight sm:text-[2.35rem]">Registra un pago manual con mejor contexto</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Selecciona a quien le vas a pagar, confirma el monto y deja una nota si quieres documentar el movimiento.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <HeroMetric label="Pendientes visibles" value={displayDebts.length.toString()} helper="Deudas detectadas en esta vista" />
            <HeroMetric label="Total pendiente" value={formatCurrency(totalDue, displayCurrency)} helper="Suma de montos mostrados" />
            <HeroMetric label="Contexto" value={selectedGroupId ? 'Grupo' : 'General'} helper="Origen del formulario actual" />
          </div>
        </div>
      </header>

      <main className="mx-auto mt-6 grid max-w-5xl gap-5 px-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={onSubmit} className="space-y-5">
          <SectionCard
            eyebrow="Destino"
            title="A quien le vas a pagar"
            meta={`${displayDebts.length} opciones`}
            description="Selecciona una deuda sugerida. El monto se autocompleta si existe una recomendacion."
          >
            {displayDebts.length === 0 && (
              <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-5 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">No hay deudas pendientes aqui</p>
                <p className="mt-1 leading-6">Si acabas de liquidar algo, este estado puede ser totalmente correcto.</p>
              </div>
            )}

            <div className="space-y-3">
              {displayDebts.map((debt, index) => {
                const person = members.find((member) => member.uid === debt.to)
                const name = person?.label || debt.to
                const active = toUserId === debt.to

                return (
                  <label
                    key={`${debt.to}-${debt.groupId || 'general'}-${index}`}
                    className={`flex cursor-pointer items-center gap-3 rounded-[1.6rem] border px-4 py-4 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.65)] transition ${
                      active
                        ? 'border-slate-300 bg-slate-950 text-white'
                        : 'border-white/80 bg-white/[0.95] hover:-translate-y-0.5'
                    }`}
                  >
                    <input type="radio" className="hidden" value={debt.to} {...register('toUserId')} />
                    <UserAvatar name={name} photoURL={person?.photoURL} />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-semibold ${active ? 'text-white' : 'text-slate-900'}`}>{name}</p>
                      <p className={`mt-1 text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                        Debes {formatCurrency(debt.amount, displayCurrency)}
                        {debt.groupId ? ' en un grupo' : ' sin grupo especifico'}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                        active ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Seleccionado
                    </span>
                  </label>
                )
              })}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Detalle"
            title="Confirma el pago"
            meta={selectedGroupId ? 'Con grupo' : 'General'}
            description="Puedes ajustar el monto, elegir la fecha del registro y dejar una nota opcional."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <FieldBlock label="Monto" error={errors.amount ? 'Ingresa un monto valido' : undefined}>
                <div className="flex items-center rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <span className="pr-3 text-sm font-semibold text-slate-500">{currencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="w-full bg-transparent text-2xl font-semibold text-slate-900 outline-none"
                    placeholder="0.00"
                    {...register('amount', { valueAsNumber: true, min: 0.01 })}
                  />
                </div>
              </FieldBlock>

              <FieldBlock label="Fecha" error={errors.date?.message}>
                <input
                  type="date"
                  className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-slate-300"
                  {...register('date')}
                />
              </FieldBlock>
            </div>

            <FieldBlock className="mt-4" label="Nota opcional" error={errors.note?.message}>
              <textarea
                rows={4}
                className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-slate-300"
                placeholder="Ej: Pago de gastos compartidos"
                {...register('note')}
              />
            </FieldBlock>
          </SectionCard>

          {error && (
            <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !toUserId || !amountValue || amountValue <= 0}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-sm transition ${
              isSubmitting || !toUserId || !amountValue || amountValue <= 0
                ? 'cursor-not-allowed bg-slate-300'
                : 'bg-slate-950 hover:brightness-110'
            }`}
          >
            <WalletIcon />
            {isSubmitting ? 'Guardando pago...' : 'Registrar pago'}
          </button>
        </form>

        <aside className="space-y-4">
          <section className="rounded-[2rem] border border-white/80 bg-white/[0.9] p-5 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Vista previa</p>
            <div className="mt-4 space-y-3">
              <PreviewRow label="Destino" value={selectedLabel} />
              <PreviewRow label="Monto" value={formatCurrency(round2(Number(amountValue || 0)), displayCurrency)} />
              <PreviewRow label="Contexto" value={selectedGroupId ? 'Pago asociado a grupo' : 'Pago general'} />
              <PreviewRow label="Nota" value={noteValue?.trim() || 'Sin nota'} />
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/80 bg-white/[0.9] p-5 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Importante</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <p>Este flujo solo registra el pago dentro de la app. No procesa dinero real.</p>
              <p>Si el monto sugerido no coincide exactamente, puedes ajustarlo antes de guardar.</p>
            </div>
          </section>
        </aside>
      </main>
    </div>
  )
}

export default SettleUpScreen

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

const FieldBlock = ({
  label,
  error,
  className,
  children,
}: {
  label: string
  error?: string
  className?: string
  children: ReactNode
}) => (
  <div className={className}>
    <div className="mb-2 flex items-center justify-between gap-3">
      <label className="text-sm font-semibold text-slate-900">{label}</label>
      {error && <span className="text-xs font-medium text-rose-600">{error}</span>}
    </div>
    {children}
  </div>
)

const PreviewRow = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-[1.35rem] bg-slate-50 px-4 py-3">
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
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

const WalletIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="3" y="6" width="18" height="12" rx="2.5" />
    <path d="M17 12.5h2.5" />
    <circle cx="16" cy="12.5" r="1" fill="currentColor" />
  </svg>
)

const round2 = (n: number) => Math.round(Number(n) * 100) / 100 || 0
