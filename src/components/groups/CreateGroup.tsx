import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { groupSchema, type CreateGroupFormValues } from '../../lib/validations/groupSchemas'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { createGroup } from '../../features/groups/services/groupService'
import { getUserByEmail } from '../../features/users/services/userService'
import LoadingSpinner from '../common/LoadingSpinner'
import { cn } from '../../lib/utils/cn'
import { navigateBack } from '../../lib/utils/navigation'

const CreateGroup = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [resolvingMembers, setResolvingMembers] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateGroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: '', description: '', memberEmails: '' },
  })

  const memberEmailText = watch('memberEmails') || ''
  const typedMembers = memberEmailText
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (!user) return <LoadingSpinner label="Cargando sesion..." />

  const onSubmit = handleSubmit(async (values) => {
    try {
      setError(null)
      setResolvingMembers(true)
      const memberIds: string[] = []
      const emails =
        values.memberEmails
          ?.split(',')
          .map((email) => email.trim())
          .filter(Boolean) ?? []

      if (emails.length > 0) {
        for (const email of emails) {
          const found = await getUserByEmail(email)
          if (!found) throw new Error(`No encontramos el correo: ${email}`)
          memberIds.push(found.uid)
        }
      }

      const groupId = await createGroup(user.uid, {
        name: values.name.trim(),
        description: values.description?.trim(),
        memberIds,
      })

      navigate(`/groups/${groupId}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos crear el grupo.'
      setError(message)
    } finally {
      setResolvingMembers(false)
    }
  })

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
            <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-100">
              Nuevo grupo
            </span>
          </div>

          <div className="mt-6 max-w-3xl">
            <h1 className="text-3xl font-semibold leading-tight sm:text-[2.35rem]">Crea un grupo con una base mas clara</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Empieza con el nombre, agrega una descripcion si te ayuda y suma miembros por correo desde el principio o mas tarde.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <HeroMetric label="Administrador inicial" value="Tu" helper="Seras el primer admin del grupo" />
            <HeroMetric label="Invitados escritos" value={typedMembers.length.toString()} helper="Correos separados por coma" />
            <HeroMetric label="Flujo" value="Listo" helper="Creacion e invitacion en un solo paso" />
          </div>
        </div>
      </header>

      <main className="mx-auto mt-6 grid max-w-5xl gap-5 px-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form
          onSubmit={onSubmit}
          className="rounded-[2rem] border border-white/80 bg-white/[0.9] p-5 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Informacion base</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Configura el grupo</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              El grupo se crea contigo como miembro y administrador. Los invitados se resuelven por correo al guardar.
            </p>
          </div>

          <div className="mt-5 space-y-5">
            <FieldBlock
              label="Nombre del grupo"
              helper="Ponle un nombre corto y facil de identificar."
              error={errors.name?.message}
            >
              <input
                id="name"
                className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-slate-300"
                placeholder="Viaje RD, Apartamento, Roomies..."
                {...register('name')}
              />
            </FieldBlock>

            <FieldBlock
              label="Descripcion"
              helper="Opcional. Puedes usarla para reglas, contexto o recordatorios."
              error={errors.description?.message}
            >
              <textarea
                id="description"
                rows={4}
                className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-slate-300"
                placeholder="Notas del grupo, objetivos o reglas de convivencia."
                {...register('description')}
              />
            </FieldBlock>

            <FieldBlock
              label="Correos de miembros"
              helper="Separalos por coma. Si no los agregas ahora, podras invitar luego."
              error={errors.memberEmails?.message}
            >
              <input
                id="memberEmails"
                className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-slate-300"
                placeholder="correo1@ejemplo.com, correo2@ejemplo.com"
                {...register('memberEmails')}
              />
            </FieldBlock>
          </div>

          {error && (
            <div className="mt-5 rounded-[1.35rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSubmitting || resolvingMembers}
              className={cn(
                'inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              <SparkIcon />
              {isSubmitting || resolvingMembers ? 'Creando grupo...' : 'Crear grupo'}
            </button>
            <button
              type="button"
              onClick={() => navigateBack(navigate, '/groups')}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <section className="rounded-[2rem] border border-white/80 bg-white/[0.9] p-5 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Vista previa</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">{watch('name')?.trim() || 'Tu nuevo grupo'}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {watch('description')?.trim() || 'Aparecera aqui una vista corta del contexto del grupo.'}
            </p>
            <div className="mt-4 space-y-3">
              <PreviewRow label="Administrador" value={user.displayName || user.email || 'Tu cuenta'} />
              <PreviewRow label="Invitados detectados" value={typedMembers.length.toString()} />
              <PreviewRow label="Correo principal" value={user.email || 'Sin correo visible'} />
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/80 bg-white/[0.9] p-5 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Buenas practicas</p>
            <div className="mt-4 space-y-4">
              <TipItem
                title="Usa un nombre especifico"
                description="Ayuda a encontrar rapido el grupo cuando tengas varios viajes, casas o eventos."
              />
              <TipItem
                title="Invita por correo valido"
                description="Cada correo debe pertenecer a un usuario existente para poder agregarse al crear."
              />
              <TipItem
                title="Puedes crecer despues"
                description="Si quieres avanzar rapido, crea el grupo ahora y suma personas mas tarde."
              />
            </div>
          </section>
        </aside>
      </main>
    </div>
  )
}

export default CreateGroup

const FieldBlock = ({
  label,
  helper,
  error,
  children,
}: {
  label: string
  helper: string
  error?: string
  children: ReactNode
}) => (
  <div className="space-y-2">
    <div className="flex items-start justify-between gap-3">
      <div>
        <label className="text-sm font-semibold text-slate-900">{label}</label>
        <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
      </div>
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

const TipItem = ({ title, description }: { title: string; description: string }) => (
  <div className="rounded-[1.35rem] bg-slate-50 px-4 py-4">
    <p className="text-sm font-semibold text-slate-900">{title}</p>
    <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
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

const SparkIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3 1.7 4.8L18.5 9l-4.8 1.2L12 15l-1.7-4.8L5.5 9l4.8-1.2L12 3Z" />
    <path d="M19 15.5 19.9 18l2.6.6-2.6.7-.9 2.4-.9-2.4-2.6-.7 2.6-.6.9-2.5Z" />
  </svg>
)
