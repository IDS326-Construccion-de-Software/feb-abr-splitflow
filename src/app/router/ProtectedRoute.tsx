import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/hooks/useAuth'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const ProtectedRoute = () => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingSpinner label="Cargando sesión..." />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />

  return <Outlet />
}

export default ProtectedRoute
