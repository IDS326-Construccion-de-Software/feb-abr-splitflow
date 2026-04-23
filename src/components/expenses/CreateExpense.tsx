import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { UseFormRegisterReturn } from 'react-hook-form'
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
import {
  splitEquallyWithRemainder,
  formatCurrency,
  getCurrencySymbol,
  normalizeCurrency,
} from '../../lib/utils/calculations'
import { navigateBack } from '../../lib/utils/navigation'
import UserAvatar from '../common/UserAvatar'

const CreateExpense = () => {
  const { groupId } = useParams<{ groupId: string }>()
  const { profile, user } = useAuth()
  const { group, loading } = useGroup(groupId)
  const [members, setMembers] = useState<UserProfile[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const displayCurrency = normalizeCurrency(profile?.currency)
  const currencySymbol = getCurrencySymbol(displayCurrency)

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
      currency: displayCurrency,
      date: new Date().toISOString().substring(0, 10),
      paidBy: user?.uid ?? '',
      splitType: 'equal',
      participantIds: [],
      splits: [],
    },
  })

  const description = watch('description')
  const participantIds = watch('participantIds')
  const splitType = watch('splitType')
  const amount = watch('amount')
  const paidBy = watch('paidBy')
  const splits = watch('splits')

  useEffect(() => {
    setValue('currency', displayCurrency, { shouldValidate: true })
  }, [displayCurrency, setValue])

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
      const nextSplits = splitEquallyWithRemainder(amount, participantIds)
      setValue('splits', nextSplits, { shouldValidate: true })
    }
  }, [splitType, participantIds, amount, setValue])

  const memberList = useMemo(
    () =>
      members.length
        ? members
        : group?.memberIds.map((uid) => ({ uid, email: uid, displayName: uid } as UserProfile)) || [],
    [group?.memberIds, members],
  )

  const payerLabel =
    memberList.find((member) => member.uid === paidBy)?.displayName ||
    memberList.find((member) => member.uid === paidBy)?.email ||
    'Sin seleccionar'

  const onSubmit = handleSubmit(async (values) => {
    if (!user || !groupId) return
    if (!values.participantIds.includes(user.uid)) {
      setError('Debes permanecer entre los participantes para registrar este gasto.')
      return
    }

    try {
      setError(null)
      const payload = {
        groupId,
        description: values.description,
        amount: round2(values.amount),
        currency: displayCurrency,
        date: values.date,
        paidBy: values.paidBy,
        splitType: values.splitType,
        participantIds: values.participantIds,
        splits: values.splits.map((split) => ({ uid: split.uid, amount: round2(split.amount) })),
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
    if (uid === user?.uid) return

    const currentPayer = getValues('paidBy')
    const set = new Set(participantIds)

    if (set.has(uid)) set.delete(uid)
    else set.add(uid)

    const orderedMembers = memberList.map((member) => member.uid)
    const nextIds = orderedMembers.filter((id) => set.has(id))

    setValue('participantIds', nextIds, { shouldValidate: true, shouldDirty: true })

    if (!nextIds.includes(currentPayer)) {
      const fallbackPayer = nextIds.includes(user?.uid || '') ? (user?.uid as string) : nextIds[0] || ''
      setValue('paidBy', fallbackPayer, { shouldValidate: true, shouldDirty: true })
    }

    if (splitType === 'custom') {
      const currentSplits = getValues('splits') || []
      const nextSplits = nextIds.map(
        (id) => currentSplits.find((split) => split.uid === id) || { uid: id, amount: 0 },
      )
      setValue('splits', nextSplits, { shouldValidate: true, shouldDirty: true })
    }
  }

  if (loading || membersLoading) return <LoadingSpinner label="Preparando formulario..." />

  if (!group) {
    return (
      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-4 pb-24 pt-12">
        <div className="w-full rounded-[2rem] border border-white/80 bg-white/[0.9] p-6 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Gasto</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">No pudimos cargar el grupo</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Vuelve atras y entra otra vez al grupo para intentar registrar el gasto.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="relative overflow-hidden rounded-b-[2.2rem] bg-slate-950 text-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.9)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.18),transparent_30%)]" />
        <div className="relative mx-auto max-w-5xl px-4 pb-8 pt-5">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => navigateBack(navigate, groupId ? `/groups/${groupId}` : '/groups')}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15"
              aria-label="Volver"
            >
              <BackIcon />
            </button>
            <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-100">
              Nuevo gasto
            </span>
          </div>

          <div className="mt-6 max-w-3xl">
            <h1 className="text-3xl font-semibold leading-tight sm:text-[2.35rem]">Registra un gasto con mas claridad</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Estás agregando un movimiento dentro de <span className="font-semibold text-white">{group.name}</span>. Define quien pago, entre quienes se divide y revisa la vista previa antes de guardar.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <HeroMetric label="Miembros" value={memberList.length.toString()} helper="Personas disponibles para el reparto" />
            <HeroMetric label="Participantes" value={participantIds.length.toString()} helper="Incluidos en este gasto" />
            <HeroMetric
              label="Division"
              value={splitType === 'equal' ? 'Igual' : 'Custom'}
              helper="Modo actual del reparto"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto mt-6 grid max-w-5xl gap-5 px-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={onSubmit} className="space-y-5">
          <SectionCard
            eyebrow="Basico"
            title="Datos del gasto"
            meta={group.name}
            description="Empieza por la descripcion, el monto y la fecha del movimiento."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <InputField
                  label="Descripcion"
                  placeholder="Ej: Cena en restaurante"
                  register={register('description')}
                  error={errors.description?.message}
                />
              </div>

              <InputField
                label="Monto"
                type="number"
                step="0.01"
                min="0.01"
                prefix={currencySymbol}
                register={register('amount', { valueAsNumber: true })}
                error={errors.amount?.message}
              />

              <InputField label="Fecha" type="date" register={register('date')} error={errors.date?.message} />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Pagador"
            title="Quien pago"
            meta={payerLabel}
            description="El pagador debe quedar incluido entre los participantes del gasto."
          >
            <div className="grid gap-3 md:grid-cols-2">
              {memberList.map((member) => {
                const active = paidBy === member.uid
                const name = member.displayName || member.email || member.uid

                return (
                  <label
                    key={member.uid}
                    className={`flex cursor-pointer items-center gap-3 rounded-[1.5rem] border px-4 py-4 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.65)] transition ${
                      active
                        ? 'border-slate-300 bg-slate-950 text-white'
                        : 'border-white/80 bg-white/[0.95] hover:-translate-y-0.5'
                    }`}
                  >
                    <UserAvatar name={name} photoURL={member.photoURL} tone="teal" />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-semibold ${active ? 'text-white' : 'text-slate-900'}`}>{name}</p>
                      <p className={`mt-1 truncate text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                        {member.email || member.uid}
                      </p>
                    </div>
                    <input type="radio" value={member.uid} className="hidden" {...register('paidBy')} />
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                        active ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {active ? 'Activo' : 'Elegir'}
                    </span>
                  </label>
                )
              })}
            </div>
            {errors.paidBy?.message && <p className="mt-3 text-sm text-rose-600">{errors.paidBy.message}</p>}
          </SectionCard>

          <SectionCard
            eyebrow="Reparto"
            title="Como se divide"
            meta={splitType === 'equal' ? 'Division igual' : 'Division personalizada'}
            description="Puedes repartir por partes iguales o editar montos manualmente por persona."
          >
            <div className="grid grid-cols-2 gap-2">
              <TabButton active={splitType === 'equal'} onClick={() => setValue('splitType', 'equal', { shouldValidate: true })}>
                Igual
              </TabButton>
              <TabButton active={splitType === 'custom'} onClick={() => setValue('splitType', 'custom', { shouldValidate: true })}>
                Personalizado
              </TabButton>
            </div>

            <div className="mt-4 space-y-3">
              {memberList.map((member) => {
                const included = participantIds.includes(member.uid)
                const isCurrentUser = member.uid === user?.uid
                const index = participantIds.indexOf(member.uid)
                const splitEntry = splits.find((item) => item.uid === member.uid)
                const splitAmount = splitEntry ? Number(splitEntry.amount || 0) : 0
                const name = member.displayName || member.email || member.uid

                return (
                  <div
                    key={member.uid}
                    className={`rounded-[1.5rem] border px-4 py-4 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.65)] ${
                      included ? 'border-white/80 bg-white/[0.95]' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={name} photoURL={member.photoURL} tone="pink" />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{name}</p>
                          <label className="mt-1 inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                            <input
                              type="checkbox"
                              checked={included}
                              onChange={() => toggleParticipant(member.uid)}
                              disabled={isCurrentUser}
                              className="h-4 w-4 rounded border-slate-300 accent-slate-950"
                            />
                            {isCurrentUser ? 'Tu usuario siempre va incluido' : 'Incluir en este gasto'}
                          </label>
                        </div>
                      </div>

                      <div className="min-w-[120px] text-right">
                        {splitType === 'custom' ? (
                          included && index >= 0 ? (
                            <Controller
                              name={`splits.${index}.amount` as const}
                              control={control}
                              render={({ field, fieldState }) => (
                                <div className="space-y-1">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="w-full rounded-[1rem] border border-slate-200 bg-white px-3 py-2 text-right text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-300"
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
                                    <p className="text-right text-[11px] font-medium text-rose-600">{fieldState.error.message}</p>
                                  )}
                                </div>
                              )}
                            />
                          ) : (
                            <span className="text-sm font-medium text-slate-400">No incluido</span>
                          )
                        ) : (
                          <span className="text-sm font-semibold text-slate-900">{formatCurrency(splitAmount, displayCurrency)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {splitType === 'custom' && getArrayFieldError(errors.splits) && (
              <p className="mt-3 text-sm text-rose-600">{getArrayFieldError(errors.splits)}</p>
            )}
          </SectionCard>

          {error && (
            <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ReceiptIcon />
            {isSubmitting ? 'Guardando gasto...' : 'Guardar gasto'}
          </button>
        </form>

        <aside className="space-y-4">
          <section className="rounded-[2rem] border border-white/80 bg-white/[0.9] p-5 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Vista previa</p>
            <div className="mt-4 space-y-3">
              <PreviewRow label="Descripcion" value={description?.trim() || 'Sin descripcion'} />
              <PreviewRow label="Monto" value={formatCurrency(round2(Number(amount || 0)), displayCurrency)} />
              <PreviewRow label="Pagado por" value={payerLabel} />
              <PreviewRow label="Participantes" value={participantIds.length.toString()} />
              <PreviewRow label="Division" value={splitType === 'equal' ? 'Igual' : 'Personalizada'} />
            </div>
          </section>

        </aside>
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
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm font-semibold text-slate-900">{label}</label>
      {error && <span className="text-xs font-medium text-rose-600">{error}</span>}
    </div>
    <div className="relative">
      {prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">{prefix}</span>}
      <input
        className={`w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-slate-300 ${
          prefix ? 'pl-12' : ''
        }`}
        {...register}
        {...props}
      />
    </div>
  </div>
)

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

const TabButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full px-4 py-3 text-sm font-semibold transition ${
      active ? 'bg-slate-950 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`}
  >
    {children}
  </button>
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

const ReceiptIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 4.5h10a2 2 0 0 1 2 2V20l-3-1.5L13 20l-3-1.5L7 20V6.5a2 2 0 0 1 2-2Z" />
    <path d="M9.5 9.5h5M9.5 13h5" />
  </svg>
)

const round2 = (n: number) => Math.round(n * 100) / 100

const getArrayFieldError = (error: unknown): string | undefined => {
  if (!error || Array.isArray(error) || typeof error !== 'object') return undefined
  if (!('message' in error)) return undefined

  const message = (error as { message?: unknown }).message
  return typeof message === 'string' ? message : undefined
}
