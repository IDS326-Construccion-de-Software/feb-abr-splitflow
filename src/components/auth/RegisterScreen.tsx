import { Link, useNavigate } from 'react-router-dom'
import AuthScreenShell from './AuthScreenShell'
import RegisterForm from '../../features/auth/components/RegisterForm'

const RegisterScreen = () => {
  const navigate = useNavigate()

  return (
    <AuthScreenShell
      eyebrow="Nuevo acceso"
      heroTitle="Crea tu espacio para dividir gastos con menos fricción."
      heroDescription="Configura tu perfil, arma tus grupos y empieza a registrar movimientos desde una base ordenada."
      highlights={[
        {
          title: 'Perfil listo',
          description: 'Tu cuenta queda preparada para sincronizar gastos, amigos y grupos.',
        },
        {
          title: 'Todo centralizado',
          description: 'Pagos, balances y miembros quedan reunidos en un solo flujo.',
        },
        {
          title: 'Sin pasos extra',
          description: 'Con tu correo basta para empezar y seguir usando la app desde cualquier sesión.',
        },
      ]}
      cardBadge="Registro"
      cardTitle="Crea tu cuenta"
      cardDescription="Usa tu correo para crear un perfil y empezar a dividir gastos en segundos."
      footer={
        <p className="text-center text-sm text-slate-600">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-teal-600 hover:underline">
            Inicia sesión
          </Link>
        </p>
      }
    >
      <RegisterForm onSuccess={() => navigate('/login', { replace: true, state: { registered: true } })} />
    </AuthScreenShell>
  )
}

export default RegisterScreen
