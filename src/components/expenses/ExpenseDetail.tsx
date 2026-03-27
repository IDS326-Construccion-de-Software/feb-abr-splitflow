import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ScreenContainer from '../common/ScreenContainer'
import LoadingSpinner from '../common/LoadingSpinner'
import { useExpense } from '../../features/expenses/hooks/useExpense'
import { getUsersByIds } from '../../features/users/services/userService'
import type { UserProfile } from '../../types/user'
import { cn } from '../../lib/utils/cn'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { deleteExpense } from '../../features/expenses/services/expenseService'
import { logActivity } from '../../features/activity/services/activityService'
import { navigateBack } from '../../lib/utils/navigation'

const ExpenseDetail = () => {
  const { expenseId } = useParams<{ expenseId: string }>()
  const { expense, loading } = useExpense(expenseId)
  const { user } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [actionError, setActionError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

  if (loading) return <LoadingSpinner label="Cargando gasto..." />
  if (!expense) {
    return (
      <ScreenContainer title="Gasto no encontrado">
        <div className="glass-card rounded-2xl border border-white/60 p-5 shadow-card">
          <p className="text-sm text-slate-600">No pudimos cargar este gasto.</p>
          <Link to="/groups" className="mt-3 inline-block text-sm font-semibold text-teal-600">
            Volver
          </Link>
        </div>
      </ScreenContainer>
    )
  }

  const userLabel = (uid: string) => users.find((u) => u.uid === uid)?.displayName || 'Usuario'
  const canDelete = Boolean(user && user.uid === expense.createdBy)

  const handleDelete = async () => {
    if (!expense || !user || user.uid !== expense.createdBy || isDeleting) return

    const confirmed = window.confirm('¿Quieres eliminar este gasto? Esta accion no se puede deshacer.')
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
    <ScreenContainer
      title={expense.description}
      subtitle={`Gasto en grupo · ${expense.currency}${expense.amount.toFixed(2)}`}
      className="max-w-3xl"
    >
      <div className="glass-card space-y-4 rounded-2xl border border-white/60 p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigateBack(navigate, `/groups/${expense.groupId}`)}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Volver
          </button>

          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar gasto'}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span className="rounded-full bg-teal-50 px-3 py-1 text-teal-700">
            Monto {expense.currency}
            {expense.amount.toFixed(2)}
          </span>
          <span className="rounded-full bg-ocean-50 px-3 py-1 text-ocean-700">Pago {userLabel(expense.paidBy)}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
            {expense.splitType === 'equal' ? 'Division igual' : 'Division personalizada'}
          </span>
        </div>

        {actionError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {actionError}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Participantes</p>
          <div className="flex flex-wrap gap-2">
            {expense.participantIds.map((uid) => (
              <span key={uid} className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700">
                {userLabel(uid)}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Splits</p>
          <div className="space-y-2">
            {expense.splits.map((split) => (
              <div
                key={split.uid}
                className={cn(
                  'flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm shadow-sm',
                )}
              >
                <span className="text-slate-700">{userLabel(split.uid)}</span>
                <span className="font-semibold text-slate-900">
                  {expense.currency}
                  {split.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">Fecha: {expense.date}</div>

        <Link to={`/groups/${expense.groupId}`} className="inline-block text-sm font-semibold text-teal-600">
          Volver al grupo
        </Link>
      </div>
    </ScreenContainer>
  )
}

export default ExpenseDetail
