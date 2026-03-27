import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import LoadingSpinner from '../common/LoadingSpinner'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { useUserExpenses } from '../../features/expenses/hooks/useUserExpenses'
import { useUserSettlements } from '../../features/settlements/hooks/useUserSettlements'
import { computeGroupNetBalances, simplifyTransfers } from '../../lib/utils/calculations'
import { createSettlement } from '../../features/settlements/services/settlementService'
import { logActivity } from '../../features/activity/services/activityService'
import { getUsersByIds } from '../../features/users/services/userService'
import type { UserProfile } from '../../types/user'
import { navigateBack } from '../../lib/utils/navigation'

type SettleForm = {
  amount: number
  date: string
  note?: string
  toUserId?: string
  groupId?: string
}

type Debt = { to: string; amount: number; groupId?: string }

const SettleUpScreen = () => {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [members, setMembers] = useState<Array<{ uid: string; label: string }>>([])
  const { expenses, loading: expLoading } = useUserExpenses(user?.uid)
  const { settlements, loading: setLoading } = useUserSettlements(user?.uid)

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
  const presetTo = searchParams.get('to') || ''
  const presetAmount = Number(searchParams.get('amount') || 0)

  const filteredExpenses = useMemo(
    () => (selectedGroupId ? expenses.filter((e) => e.groupId === selectedGroupId) : expenses),
    [expenses, selectedGroupId],
  )

  const filteredSettlements = useMemo(
    () => (selectedGroupId ? settlements.filter((s) => s.groupId === selectedGroupId) : settlements),
    [settlements, selectedGroupId],
  )

  const debts = useMemo<Debt[]>(() => {
    if (!user) return []
    const net = computeGroupNetBalances(filteredExpenses, filteredSettlements)
    return simplifyTransfers(net)
      .filter((t) => t.from === user.uid)
      .map((t) => ({ to: t.to, amount: round2(t.amount), groupId: selectedGroupId || undefined }))
  }, [filteredExpenses, filteredSettlements, selectedGroupId, user])

  const presetDebt = useMemo<Debt | null>(() => {
    if (presetTo && presetAmount > 0) {
      return { to: presetTo, amount: round2(presetAmount), groupId: selectedGroupId || undefined }
    }
    return null
  }, [presetAmount, presetTo, selectedGroupId])

  const displayDebts = useMemo(() => {
    if (presetDebt && !debts.find((d) => d.to === presetDebt.to)) {
      return [presetDebt, ...debts]
    }
    return debts
  }, [debts, presetDebt])

  useEffect(() => {
    if (presetTo) setValue('toUserId', presetTo)
    if (presetAmount > 0) setValue('amount', round2(presetAmount))
  }, [presetAmount, presetTo, setValue])

  useEffect(() => {
    const loadMembers = async () => {
      const ids = new Set<string>()
      filteredExpenses.forEach((e) => {
        e.participantIds?.forEach((id) => ids.add(id))
        if (e.paidBy) ids.add(e.paidBy)
      })
      filteredSettlements.forEach((s) => {
        if (s.fromUserId) ids.add(s.fromUserId)
        if (s.toUserId) ids.add(s.toUserId)
      })
      if (presetDebt?.to) ids.add(presetDebt.to)
      if (ids.size === 0) {
        setMembers([])
        return
      }
      const list = await getUsersByIds(Array.from(ids))
      setMembers(list.map((u: UserProfile) => ({ uid: u.uid, label: u.displayName || u.email || u.uid })))
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
    const found = displayDebts.find((d) => d.to === toUserId)
    if (found) {
      setValue('amount', round2(found.amount))
    }
  }, [toUserId, displayDebts, setValue])

  const isLoading = expLoading || setLoading

  if (!user) return <LoadingSpinner label="Cargando sesión..." />
  if (isLoading) return <LoadingSpinner label="Preparando liquidación..." />

  const onSubmit = handleSubmit(async (values) => {
    try {
      setError(null)
      const targetId = values.toUserId
      const target = members.find((m) => m.uid === targetId)
      const targetLabel = target?.label || targetId || ''

      if (!targetId) throw new Error('Selecciona a quién pagar.')
      if (targetId === user.uid) throw new Error('No puedes registrar un pago contigo mismo.')
      if (values.amount <= 0) throw new Error('El monto debe ser mayor a 0.')

      const normalizedAmount = round2(values.amount)
      const groupId = selectedGroupId?.trim() || undefined
      const note = values.note?.trim()

      const settlementId = await createSettlement({
        groupId,
        fromUserId: user.uid,
        toUserId: targetId!,
        amount: normalizedAmount,
        currency: 'RD$',
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
    <div className="min-h-screen bg-[#f5f6fa]">
      <header className="sticky top-0 z-20 bg-white shadow-[0_1px_0_rgba(15,23,42,0.06)]">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigateBack(navigate, '/balances')}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
            aria-label="Volver"
          >
            <BackIcon />
          </button>
          <h1 className="text-base font-semibold text-slate-900">Liquidar Saldo</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6">
        <form className="space-y-5" onSubmit={onSubmit}>
          <Section title="Pagar a">
            {displayDebts.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm">
                No tienes deudas pendientes aquí.
              </div>
            )}
            {displayDebts.length > 0 && (
              <div className="space-y-3">
                {displayDebts.map((d) => {
                  const person = members.find((m) => m.uid === d.to)
                  const name = person?.label || d.to
                  return (
                    <label
                      key={d.to}
                      className={`flex cursor-pointer items-center gap-3 rounded-2xl border bg-white px-4 py-4 shadow-sm transition ${
                        toUserId === d.to ? 'border-slate-300 shadow-slate-200/80' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input type="radio" className="hidden" value={d.to} {...register('toUserId')} />
                      <Avatar initial={name.charAt(0).toUpperCase()} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">{name}</p>
                        <p className="text-xs text-slate-600">
                          Debes: RD$
                          {round2(d.amount).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </Section>

          <Section title="Monto a pagar">
            <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <span className="pr-3 text-sm font-semibold text-slate-500">RD$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="w-full bg-transparent text-2xl font-semibold text-slate-900 outline-none"
                placeholder="0"
                {...register('amount', { valueAsNumber: true, min: 0.01 })}
              />
            </div>
            {errors.amount && <p className="text-xs text-rose-600">Ingresa un monto válido</p>}
          </Section>

          <Section title="Nota (opcional)">
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-slate-300"
              placeholder="Ej: Pago de gastos compartidos"
              {...register('note')}
            />
          </Section>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !toUserId || !amountValue || amountValue <= 0}
            className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition ${
              isSubmitting || !toUserId || !amountValue || amountValue <= 0
                ? 'cursor-not-allowed bg-slate-300'
                : 'bg-[#07b38a] hover:brightness-105'
            }`}
          >
            {isSubmitting ? 'Guardando...' : 'Registrar Pago'}
          </button>

          <p className="text-center text-xs text-slate-500">
            Esto registrará el pago manualmente. No se procesará ningún pago real.
          </p>
        </form>
      </main>
    </div>
  )
}

export default SettleUpScreen

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="space-y-2">
    <p className="text-sm font-semibold text-slate-800">{title}</p>
    {children}
  </div>
)

const Avatar = ({ initial }: { initial: string }) => (
  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 via-purple-500 to-pink-500 text-sm font-semibold text-white shadow-sm">
    {initial || 'A'}
  </div>
)

const BackIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="m15 5-7 7 7 7" />
  </svg>
)

const round2 = (n: number) => Math.round(Number(n) * 100) / 100 || 0
