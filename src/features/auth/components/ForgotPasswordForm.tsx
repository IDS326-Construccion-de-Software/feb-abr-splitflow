import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '../../../lib/utils/cn'
import { resetPasswordSchema, type ResetPasswordFormValues } from '../../../lib/validations/authSchemas'
import { requestPasswordReset } from '../services/authService'
import { friendlyAuthError } from '../../../lib/utils/firebaseErrors'

type ForgotPasswordFormProps = {
  className?: string
  onBackToLogin?: (email: string) => void
}

const ForgotPasswordForm = ({ className, onBackToLogin }: ForgotPasswordFormProps) => {
  const [error, setError] = useState<string | null>(null)
  const [successEmail, setSuccessEmail] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      setError(null)
      await requestPasswordReset(values.email)
      setSuccessEmail(values.email)
    } catch (err) {
      setSuccessEmail(null)
      setError(friendlyAuthError(err))
      console.error(err)
    }
  })

  return (
    <form onSubmit={onSubmit} className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="reset-email">
          Correo
        </label>
        <input
          id="reset-email"
          type="email"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none"
          placeholder="correo@ejemplo.com"
          {...register('email')}
        />
        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {successEmail && (
        <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
          <p>
            Enviamos un enlace de recuperación a <span className="font-semibold">{successEmail}</span>.
          </p>
          <p className="text-xs leading-5 text-emerald-700">
            Si no lo ves enseguida, revisa spam o promociones. Puedes volver a enviarlo si hace falta.
          </p>
          {onBackToLogin && (
            <button
              type="button"
              onClick={() => onBackToLogin(successEmail)}
              className="inline-flex rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:brightness-105"
            >
              Volver al login
            </button>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-gradient-teal-blue px-4 py-3 text-sm font-semibold text-white shadow-card transition hover:opacity-95 disabled:opacity-60"
      >
        {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
      </button>
    </form>
  )
}

export default ForgotPasswordForm
