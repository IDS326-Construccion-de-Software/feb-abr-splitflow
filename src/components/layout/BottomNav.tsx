import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils/cn'

const tabs = [
  { to: '/dashboard', label: 'Inicio', icon: '🏠' },
  { to: '/groups', label: 'Grupos', icon: '👥' },
  { to: '/friends', label: 'Amigos', icon: '🤝' },
  { to: '/balances', label: 'Saldos', icon: '💰' },
  { to: '/profile', label: 'Ajustes', icon: '⚙️' },
]

const BottomNav = () => {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-semibold transition',
                isActive ? 'text-teal-600' : 'text-slate-500',
              )
            }
          >
            <span className="text-lg">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default BottomNav
