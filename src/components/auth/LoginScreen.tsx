import { Link, useNavigate, useLocation } from 'react-router-dom'
import ScreenContainer from '../common/ScreenContainer'
import LoginForm from '../../features/auth/components/LoginForm'

const LoginScreen = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'

  return (
    <div className="min-h-screen bg-gradient-teal-blue/10">
      <ScreenContainer
        className="flex min-h-screen items-center justify-center"
        title="Bienvenido de nuevo"
        subtitle="Administra tus gastos compartidos de forma sencilla."
      >
        <div className="glass-card w-full max-w-md p-6">
          <div className="mb-6 space-y-1 text-left">
            <h2 className="text-2xl font-semibold text-slate-900">Inicia sesión</h2>
            <p className="text-sm text-slate-600">
              Ingresa con tu correo para continuar. ¡Tus balances te esperan!
            </p>
          </div>
          <LoginForm onSuccess={() => navigate(from, { replace: true })} />
          <p className="mt-4 text-center text-sm text-slate-600">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="font-semibold text-teal-600 hover:underline">
              Crear cuenta
            </Link>
          </p>
        </div>
      </ScreenContainer>
    </div>
  )
}

export default LoginScreen
