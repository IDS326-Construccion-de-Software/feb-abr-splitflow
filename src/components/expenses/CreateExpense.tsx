import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from 'react-router-dom'
import LoadingSpinner from '../common/LoadingSpinner'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { expenseSchema, type ExpenseFormValues } from '../../lib/validations/expenseSchemas'
import { useGroup } from '../../features/groups/hooks/useGroup'
import { createExpense } from '../../features/expenses/services/expenseService'
import { getUsersByIds } from '../../features/users/services/userService'
import type { UserProfile } from '../../types/user'
import { logActivity } from '../../features/activity/services/activityService'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { splitEquallyWithRemainder, formatCurrency } from '../../lib/utils/calculations'
import { navigateBack } from '../../lib/utils/navigation'

const CreateExpense = () => {
  const { groupId } = useParams<{ groupId: string }>()
  const { user } = useAuth()
  const { group, loading } = useGroup(groupId)
  const [members, setMembers] = useState<UserProfile[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const defaultCurrency = 'RD$'

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: '',
      amount: 0,
      currency: defaultCurrency,
      date: new Date().toISOString().substring(0, 10),
      paidBy: user?.uid ?? '',
      splitType: 'equal',
      participantIds: [],
      splits: [],
    },
  })

  const participantIds = watch('participantIds')
  const splitType = watch('splitType')
  const amount = watch('amount')

  useEffect(() => {
    if (!group?.memberIds?.length) return
    const load = async () => {
      setMembersLoading(true)
      try {
        const users = await getUsersByIds(group.memberIds)
        setMembers(users)
      } catch (err) {
        console.error('No se pudieron cargar miembros, usando IDs como fallback', err)
        setMembers(group.memberIds.map((uid) => ({ uid, email: uid, displayName: uid } as UserProfile)))
      } finally {
        setMembersLoading(false)
        setValue('participantIds', group.memberIds)
        setValue('paidBy', user?.uid ?? group.memberIds[0])
      }
    }
    load()
  }, [group?.memberIds, setValue, user?.uid])

  useEffect(() => {
    if (splitType === 'equal' && participantIds.length > 0 && amount > 0) {
      const splits = splitEquallyWithRemainder(amount, participantIds)
      setValue('splits', splits, { shouldValidate: true })
    }
  }, [splitType, participantIds, amount, setValue])

  const onSubmit = handleSubmit(async (values) => {
    if (!user || !groupId) return
    try {
      setError(null)
      const payload = {
        groupId,
        description: values.description,
        amount: round2(values.amount),
        currency: values.currency,
        date: values.date,
        paidBy: values.paidBy,
        splitType: values.splitType,
        participantIds: values.participantIds,
        splits: values.splits.map((s) => ({ uid: s.uid, amount: round2(s.amount) })),
        createdBy: user.uid,
      }
      const expenseId = await createExpense(payload)
      await logActivity({
        entityType: 'expense',
        entityId: expenseId,
        groupId,
        action: 'create',
        actorUid: user.uid,
        meta: { description: values.description, amount: payload.amount },
      })
      navigate(`/expenses/${expenseId}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos guardar el gasto.'
      setError(message)
    }
  })

  const toggleParticipant = (uid: string) => {
    const set = new Set(participantIds)
    if (set.has(uid)) set.delete(uid)
    else set.add(uid)
    const orderedMembers = members.map((m) => m.uid)
    const nextIds = orderedMembers.filter((id) => set.has(id))
    setValue('participantIds', nextIds, { shouldValidate: true, shouldDirty: true })

    // Mantener splits sincronizados en modo personalizado
    if (splitType === 'custom') {
      const currentSplits = getValues('splits') || []
      const nextSplits = nextIds.map((id) => currentSplits.find((s) => s.uid === id) || { uid: id, amount: 0 })
      setValue('splits', nextSplits, { shouldValidate: true, shouldDirty: true })
    }
  }

  if (loading || membersLoading) return <LoadingSpinner label="Preparando formulario..." />
  if (!group) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white px-4 py-6 shadow-sm shadow-slate-200/60">
          <p className="text-sm text-slate-600">No pudimos cargar el grupo.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] pb-24">
      <header className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <button
            onClick={() => navigateBack(navigate, groupId ? `/groups/${groupId}` : '/groups')}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
            aria-label="Volver"
          >
            <BackIcon />
          </button>
          <h1 className="text-base font-semibold text-slate-900">Agregar Gasto</h1>
          <span className="h-10 w-10" />
        </div>
      </header>

      <main className="mx-auto mt-4 max-w-4xl px-4">
        <form
          onSubmit={onSubmit}
          className="space-y-5 rounded-2xl bg-white px-5 py-5 shadow-sm shadow-slate-200/60"
        >
          <InputField
            label="Descripción *"
            placeholder="Ej: Cena en restaurante"
            register={register('description')}
            error={errors.description?.message}
          />

          <InputField
            label="Monto *"
            type="number"
            step="0.01"
            min="0.01"
            prefix="RD$"
            register={register('amount', { valueAsNumber: true })}
            error={errors.amount?.message}
          />

          <InputField
            label="Fecha"
            type="date"
            register={register('date')}
            error={errors.date?.message}
          />

          <SectionCard title="Pagado por">
            <div className="space-y-2">
              {members.map((m) => {
                const isActive = watch('paidBy') === m.uid
                return (
                  <label
                    key={m.uid}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 text-sm shadow-sm transition ${
                      isActive ? 'border-teal-400 bg-emerald-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <Avatar initial={(m.displayName || m.email || 'A').charAt(0).toUpperCase()} tone="teal" />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{m.displayName || m.email}</p>
                    </div>
                    <input type="radio" value={m.uid} className="hidden" {...register('paidBy')} />
                  </label>
                )
              })}
            </div>
          </SectionCard>

          <SectionCard title="Dividir entre">
            <div className="grid grid-cols-2 gap-2">
              <TabButton active={splitType === 'equal'} onClick={() => setValue('splitType', 'equal', { shouldValidate: true })}>
                Igual
              </TabButton>
              <TabButton active={splitType === 'custom'} onClick={() => setValue('splitType', 'custom', { shouldValidate: true })}>
                Personalizado
              </TabButton>
            </div>

            <div className="mt-3 space-y-2">
              {members.map((m) => {
                const included = participantIds.includes(m.uid)
                const idx = participantIds.indexOf(m.uid)
                const equalSplit = watch(`splits.${idx}.amount` as const)
                const amountValue =
                  splitType === 'custom'
                    ? idx >= 0
                      ? watch(`splits.${idx}.amount` as const) || 0
                      : 0
                    : equalSplit ?? 0
                return (
                  <div
                    key={m.uid}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar initial={(m.displayName || m.email || 'A').charAt(0).toUpperCase()} tone="pink" />
                      <div className="flex flex-col">
                        <span className="font-semibold">{m.displayName || m.email}</span>
                        <label className="text-xs text-teal-600">
                          <input
                            type="checkbox"
                            checked={included}
                            onChange={() => toggleParticipant(m.uid)}
                            className="mr-1 accent-teal-600"
                          />
                          Incluir
                        </label>
                      </div>
                    </div>
                    <div className="text-right text-xs font-semibold text-slate-700">
                      {splitType === 'custom' ? (
                        included ? (
                          <Controller
                            name={`splits.${idx}.amount` as const}
                            control={control}
                            render={({ field, fieldState }) => (
                              <div className="space-y-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right text-xs focus:border-teal-500 focus:outline-none"
                                  name={field.name}
                                  ref={field.ref}
                                  value={Number.isFinite(field.value) ? field.value : ''}
                                  onBlur={field.onBlur}
                                  onChange={(event) => {
                                    const rawValue = event.target.value
                                    field.onChange(rawValue === '' ? Number.NaN : Number(rawValue))
                                  }}
                                />
                                {fieldState.error?.message && (
                                  <p className="w-24 text-right text-[11px] font-medium text-red-500">
                                    {fieldState.error.message}
                                  </p>
                                )}
                              </div>
                            )}
                          />
                        ) : (
                          <span className="text-slate-500">—</span>
                        )
                      ) : (
                        <span>{formatCurrency(Number(amountValue || 0))}</span>
                      )}
                    </div>
                  </div>
                )
              })}
              {splitType === 'custom' && getArrayFieldError(errors.splits) && (
                <p className="text-xs text-red-500">{getArrayFieldError(errors.splits)}</p>
              )}
            </div>
          </SectionCard>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:opacity-60"
          >
            {isSubmitting ? 'Guardando...' : 'Agregar Gasto'}
          </button>
        </form>
      </main>
    </div>
  )
}

export default CreateExpense

const InputField = ({
  label,
  register,
  error,
  prefix,
  ...props
}: {
  label: string
  register: UseFormRegisterReturn
  error?: string
  prefix?: string
  type?: string
  step?: string
  min?: string
  placeholder?: string
}) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-slate-700">{label}</label>
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">{prefix}</span>}
      <input
        className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none ${prefix ? 'pl-10' : ''}`}
        {...register}
        {...props}
      />
    </div>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
)

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3 rounded-2xl bg-white px-4 py-4 shadow-sm shadow-slate-200/60">
    <p className="text-sm font-semibold text-slate-800">{title}</p>
    {children}
  </div>
)

const TabButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-lg px-3 py-2 text-sm font-semibold shadow-sm ${active ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}
  >
    {children}
  </button>
)

const Avatar = ({ initial, tone }: { initial: string; tone: 'teal' | 'pink' }) => {
  const palette =
    tone === 'teal'
      ? 'from-emerald-400 via-teal-500 to-emerald-500 text-white'
      : 'from-pink-400 via-fuchsia-500 to-purple-500 text-white'
  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${palette} text-sm font-semibold shadow-sm`}>
      {initial || 'A'}
    </div>
  )
}

const BackIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="m15 5-7 7 7 7" />
  </svg>
)

const round2 = (n: number) => Math.round(n * 100) / 100

const getArrayFieldError = (error: unknown): string | undefined => {
  if (!error || Array.isArray(error) || typeof error !== 'object') return undefined
  if (!('message' in error)) return undefined

  const message = (error as { message?: unknown }).message
  return typeof message === 'string' ? message : undefined
}
