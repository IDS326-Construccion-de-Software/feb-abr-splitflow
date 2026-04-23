import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import PushNotificationListener from '../../features/notifications/components/PushNotificationListener'

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_50%,#f8fafc_100%)] text-slate-900">
      <PushNotificationListener />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-64 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.12),transparent_55%)]" />
      <main className="relative z-10 pb-28">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

export default AppLayout
