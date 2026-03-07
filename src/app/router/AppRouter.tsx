import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginScreen from '../../components/auth/LoginScreen'
import RegisterScreen from '../../components/auth/RegisterScreen'
import ProtectedRoute from './ProtectedRoute'
import AppLayout from '../../components/layout/AppLayout'
import Dashboard from '../../components/home/Dashboard'
import GroupList from '../../components/groups/GroupList'
import BalancesScreen from '../../components/balances/BalancesScreen'
import ProfileScreen from '../../components/profile/ProfileScreen'
import CreateGroup from '../../components/groups/CreateGroup'
import GroupDetail from '../../components/groups/GroupDetail'
import FriendsList from '../../components/friends/FriendsList'
import CreateExpense from '../../components/expenses/CreateExpense'
import ExpenseDetail from '../../components/expenses/ExpenseDetail'
import SettleUpScreen from '../../components/settle/SettleUpScreen'

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />

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
    </BrowserRouter>
  )
}

export default AppRouter
