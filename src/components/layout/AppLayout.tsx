import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <main className="pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

export default AppLayout
