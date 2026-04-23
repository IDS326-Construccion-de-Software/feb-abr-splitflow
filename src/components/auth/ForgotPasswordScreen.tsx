import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthScreenShell from './AuthScreenShell'
import ForgotPasswordForm from '../../features/auth/components/ForgotPasswordForm'

const ForgotPasswordScreen = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const handleBackToLogin = (email: string) => {
    navigate('/login', {
      replace: true,
      state: {
        ...((location.state as Record<string, unknown> | null) || {}),
        resetEmailSentTo: email,
      },
    })
  }

  return (
    <AuthScreenShell
      eyebrow="Recuperación"
      heroTitle="Recupera tu clave sin perder el acceso a tus datos."
      heroDescription="Te enviamos un enlace seguro para restablecer tu contraseña y volver a entrar a tus grupos y saldos."
      highlights={[
        {
          title: 'Enlace seguro',
          description: 'La recuperación se hace desde Firebase Auth y llega directo al correo de tu cuenta.',
        },
        {
          title: 'Proceso rápido',
          description: 'Solo necesitas tu email. No hace falta tocar grupos, gastos ni configuraciones.',
        },
        {
          title: 'Vuelta clara',
          description: 'Cuando lo envíes, podrás regresar al login con una confirmación visible.',
        },
      ]}
      cardBadge="Recuperar clave"
      cardTitle="Restablece tu contraseña"
      cardDescription="Escribe el correo de tu cuenta y revisa tu bandeja de entrada para continuar."
      footer={
        <p className="text-center text-sm text-slate-600">
          ¿Ya recuerdas tu clave?{' '}
          <Link to="/login" className="font-semibold text-teal-600 hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm onBackToLogin={handleBackToLogin} />
    </AuthScreenShell>
  )
}

export default ForgotPasswordScreen
