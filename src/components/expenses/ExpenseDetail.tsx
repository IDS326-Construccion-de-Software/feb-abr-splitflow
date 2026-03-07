import { Link, useParams } from 'react-router-dom'
import ScreenContainer from '../common/ScreenContainer'
import LoadingSpinner from '../common/LoadingSpinner'
import { useExpense } from '../../features/expenses/hooks/useExpense'
import { getUsersByIds } from '../../features/users/services/userService'
import { useEffect, useState } from 'react'
import type { UserProfile } from '../../types/user'
import { cn } from '../../lib/utils/cn'

const ExpenseDetail = () => {
  const { expenseId } = useParams<{ expenseId: string }>()
  const { expense, loading } = useExpense(expenseId)
  const [users, setUsers] = useState<UserProfile[]>([])

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

  return (
    <ScreenContainer
      title={expense.description}
      subtitle={`Gasto en grupo · ${expense.currency}${expense.amount.toFixed(2)}`}
      className="max-w-3xl"
    >
      <div className="glass-card space-y-4 rounded-2xl border border-white/60 p-6 shadow-card">
        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span className="rounded-full bg-teal-50 px-3 py-1 text-teal-700">Monto {expense.currency}{expense.amount.toFixed(2)}</span>
          <span className="rounded-full bg-ocean-50 px-3 py-1 text-ocean-700">Pagó {userLabel(expense.paidBy)}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{expense.splitType === 'equal' ? 'División igual' : 'División personalizada'}</span>
        </div>

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
            {expense.splits.map((s) => (
              <div
                key={s.uid}
                className={cn(
                  'flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm shadow-sm',
                )}
              >
                <span className="text-slate-700">{userLabel(s.uid)}</span>
                <span className="font-semibold text-slate-900">
                  {expense.currency}
                  {s.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
          Fecha: {expense.date}
        </div>

        <Link
          to={`/groups/${expense.groupId}`}
          className="inline-block text-sm font-semibold text-teal-600"
        >
          Volver al grupo
        </Link>
      </div>
    </ScreenContainer>
  )
}

export default ExpenseDetail
