import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import AuthScreenShell from './AuthScreenShell'
import LoginForm from '../../features/auth/components/LoginForm'

const LoginScreen = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = (location.state as { from?: { pathname: string }; registered?: boolean; resetEmailSentTo?: string } | null) || null
  const [resetNoticeVisible, setResetNoticeVisible] = useState(Boolean(routeState?.resetEmailSentTo))
  const [registerNoticeVisible, setRegisterNoticeVisible] = useState(Boolean(routeState?.registered))

  const resetNotice =
    resetNoticeVisible && routeState?.resetEmailSentTo ? (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-left text-sm text-emerald-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">Revisa tu correo</p>
            <p className="mt-1 leading-6">
              Enviamos el enlace de recuperación a <span className="font-semibold">{routeState.resetEmailSentTo}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setResetNoticeVisible(false)}
            className="rounded-full px-2 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            Cerrar
          </button>
        </div>
      </div>
    ) : null

  const registerNotice =
    registerNoticeVisible && routeState?.registered ? (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-left text-sm text-emerald-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">Cuenta creada</p>
            <p className="mt-1 leading-6">Ahora inicia sesion con tu correo y clave para entrar.</p>
          </div>
          <button
            type="button"
            onClick={() => setRegisterNoticeVisible(false)}
            className="rounded-full px-2 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            Cerrar
          </button>
        </div>
      </div>
    ) : null

  return (
    <AuthScreenShell
      eyebrow="SplitFlow"
      heroTitle="Entra a tu resumen sin perder el contexto."
      heroDescription="Consulta quién te debe, registra pagos y sigue tus grupos desde un acceso más claro y cuidado."
      highlights={[
        {
          title: 'Balances al día',
          description: 'Tus saldos se actualizan con cada gasto y cada pago manual registrado.',
        },
        {
          title: 'Acceso rápido',
          description: 'Entra con correo o Google y vuelve directo a la pantalla de inicio.',
        },
        {
          title: 'Recuperación simple',
          description: 'Si olvidas tu clave, puedes pedir un enlace y volver a entrar en minutos.',
        },
      ]}
      cardBadge="Acceso"
      cardTitle="Inicia sesión"
      cardDescription="Ingresa con tu correo para continuar. Tus balances, grupos y movimientos te esperan."
      notice={resetNotice || registerNotice}
      footer={
        <p className="text-center text-sm text-slate-600">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-semibold text-teal-600 hover:underline">
            Crear cuenta
          </Link>
        </p>
      }
    >
      <LoginForm onSuccess={() => navigate('/dashboard', { replace: true })} />
    </AuthScreenShell>
  )
}

export default LoginScreen
