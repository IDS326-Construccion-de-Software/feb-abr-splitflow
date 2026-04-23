import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const LoginScreen = lazy(() => import('../../components/auth/LoginScreen'))
const RegisterScreen = lazy(() => import('../../components/auth/RegisterScreen'))
const ForgotPasswordScreen = lazy(() => import('../../components/auth/ForgotPasswordScreen'))
const AppLayout = lazy(() => import('../../components/layout/AppLayout'))
const Dashboard = lazy(() => import('../../components/home/Dashboard'))
const GroupList = lazy(() => import('../../components/groups/GroupList'))
const BalancesScreen = lazy(() => import('../../components/balances/BalancesScreen'))
const ProfileScreen = lazy(() => import('../../components/profile/ProfileScreen'))
const CreateGroup = lazy(() => import('../../components/groups/CreateGroup'))
const GroupDetail = lazy(() => import('../../components/groups/GroupDetail'))
const FriendsList = lazy(() => import('../../components/friends/FriendsList'))
const CreateExpense = lazy(() => import('../../components/expenses/CreateExpense'))
const ExpenseDetail = lazy(() => import('../../components/expenses/ExpenseDetail'))
const SettleUpScreen = lazy(() => import('../../components/settle/SettleUpScreen'))

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouterFallback />}>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/register" element={<RegisterScreen />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/groups" element={<GroupList />} />
              <Route path="/groups/new" element={<CreateGroup />} />
              <Route path="/groups/:groupId" element={<GroupDetail />} />
              <Route path="/groups/:groupId/expenses/new" element={<CreateExpense />} />
              <Route path="/expenses/:expenseId" element={<ExpenseDetail />} />
              <Route path="/settle-up" element={<SettleUpScreen />} />
              <Route path="/friends" element={<FriendsList />} />
              <Route path="/balances" element={<BalancesScreen />} />
              <Route path="/profile" element={<ProfileScreen />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default AppRouter

const RouterFallback = () => (
  <div className="flex min-h-screen items-center justify-center px-4">
    <div className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white/[0.9] p-6 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
      <LoadingSpinner label="Cargando pantalla..." className="py-4" />
    </div>
  </div>
)
