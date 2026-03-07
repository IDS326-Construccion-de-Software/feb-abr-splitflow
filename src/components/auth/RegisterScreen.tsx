import { Link, useNavigate } from 'react-router-dom'
import ScreenContainer from '../common/ScreenContainer'
import RegisterForm from '../../features/auth/components/RegisterForm'

const RegisterScreen = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-teal-blue/10">
      <ScreenContainer
        className="flex min-h-screen items-center justify-center"
        title="Crea tu cuenta"
        subtitle="Configura tu perfil y empieza a dividir gastos en segundos."
      >
        <div className="glass-card w-full max-w-md p-6">
          <div className="mb-6 space-y-1 text-left">
            <h2 className="text-2xl font-semibold text-slate-900">Regístrate</h2>
            <p className="text-sm text-slate-600">
              Usa tu correo para crear un perfil y sincronizar tus gastos.
            </p>
          </div>
          <RegisterForm onSuccess={() => navigate('/dashboard', { replace: true })} />
          <p className="mt-4 text-center text-sm text-slate-600">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold text-teal-600 hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </ScreenContainer>
    </div>
  )
}

export default RegisterScreen
