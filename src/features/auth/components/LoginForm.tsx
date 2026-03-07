import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema } from '../../../lib/validations/authSchemas'
import type { LoginFormValues } from '../../../lib/validations/authSchemas'
import { useAuth } from '../hooks/useAuth'
import { cn } from '../../../lib/utils/cn'
import { friendlyAuthError } from '../../../lib/utils/firebaseErrors'

type LoginFormProps = {
  onSuccess?: () => void
  className?: string
}

const LoginForm = ({ onSuccess, className }: LoginFormProps) => {
  const { login, loginWithGoogle } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      setError(null)
      await login(values.email, values.password)
      onSuccess?.()
    } catch (err) {
      setError(friendlyAuthError(err))
      console.error(err)
    }
  })

  const handleGoogle = async () => {
    try {
      setError(null)
      await loginWithGoogle()
      onSuccess?.()
    } catch (err) {
      setError(friendlyAuthError(err))
      console.error(err)
    }
  }

  return (
    <form onSubmit={onSubmit} className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="email">
          Correo
        </label>
        <input
          id="email"
          type="email"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none"
          placeholder="correo@ejemplo.com"
          {...register('email')}
        />
        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none"
          placeholder="••••••••"
          {...register('password')}
        />
        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-gradient-teal-blue px-4 py-3 text-sm font-semibold text-white shadow-card transition hover:opacity-95 disabled:opacity-60"
      >
        {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
      </button>

      <button
        type="button"
        onClick={handleGoogle}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-400"
      >
        Continuar con Google
      </button>
    </form>
  )
}

export default LoginForm
