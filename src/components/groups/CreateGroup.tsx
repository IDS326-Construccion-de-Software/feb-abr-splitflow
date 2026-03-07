import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import ScreenContainer from '../common/ScreenContainer'
import { groupSchema, type CreateGroupFormValues } from '../../lib/validations/groupSchemas'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { createGroup } from '../../features/groups/services/groupService'
import { getUserByEmail } from '../../features/users/services/userService'
import LoadingSpinner from '../common/LoadingSpinner'
import { cn } from '../../lib/utils/cn'

const CreateGroup = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [resolvingMembers, setResolvingMembers] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateGroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: '', description: '', memberEmails: '' },
  })

  if (!user) return <LoadingSpinner label="Cargando sesión..." />

  const onSubmit = handleSubmit(async (values) => {
    try {
      setError(null)
      setResolvingMembers(true)
      const memberIds: string[] = []
      const emails =
        values.memberEmails
          ?.split(',')
          .map((e) => e.trim())
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
    <ScreenContainer
      title="Nuevo grupo"
      subtitle="Invita a tus amigos por correo o crea el grupo y agrega miembros luego."
      className="max-w-3xl"
    >
      <form
        onSubmit={onSubmit}
        className="glass-card space-y-4 rounded-2xl border border-white/60 p-6 shadow-card"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="name">
            Nombre del grupo
          </label>
          <input
            id="name"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none"
            placeholder="Viaje RD, Apartamento, Roomies..."
            {...register('name')}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="description">
            Descripción (opcional)
          </label>
          <textarea
            id="description"
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none"
            placeholder="Notas del grupo, reglas, etc."
            {...register('description')}
          />
          {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="memberEmails">
            Correos de miembros (opcional)
          </label>
          <input
            id="memberEmails"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none"
            placeholder="correo1@ejemplo.com, correo2@ejemplo.com"
            {...register('memberEmails')}
          />
          <p className="text-xs text-slate-500">
            Separa los correos con coma. Si no los agregas ahora, seguirás siendo el único miembro.
          </p>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting || resolvingMembers}
          className={cn(
            'w-full rounded-xl bg-gradient-teal-blue px-4 py-3 text-sm font-semibold text-white shadow-card transition hover:opacity-95 disabled:opacity-60',
          )}
        >
          {isSubmitting || resolvingMembers ? 'Creando...' : 'Crear grupo'}
        </button>
      </form>
    </ScreenContainer>
  )
}

export default CreateGroup
