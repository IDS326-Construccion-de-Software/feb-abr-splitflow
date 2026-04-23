import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils/cn'

type TabItem = {
  to: string
  label: string
  icon: ReactNode
}

const tabs: TabItem[] = [
  { to: '/dashboard', label: 'Inicio', icon: <HomeIcon /> },
  { to: '/groups', label: 'Grupos', icon: <GroupsIcon /> },
  { to: '/friends', label: 'Amigos', icon: <FriendsIcon /> },
  { to: '/balances', label: 'Saldos', icon: <WalletIcon /> },
  { to: '/profile', label: 'Ajustes', icon: <SettingsIcon /> },
]

const BottomNav = () => {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-3 pb-3">
      <div className="mx-auto max-w-5xl rounded-[1.75rem] border border-white/70 bg-white/[0.88] p-2 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.55)] backdrop-blur-xl">
        <div className="grid grid-cols-5 gap-1">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  'flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-[11px] font-semibold transition duration-200',
                  isActive
                    ? 'bg-slate-950 text-white shadow-[0_16px_35px_-20px_rgba(15,23,42,0.9)]'
                    : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-800',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-2xl transition',
                      isActive ? 'bg-white/12 text-white' : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {tab.icon}
                  </span>
                  <span className="truncate">{tab.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}

export default BottomNav

const iconProps = {
  className: 'h-[18px] w-[18px]',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" {...iconProps}>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6.5 9.5V20h11V9.5" />
    </svg>
  )
}

function GroupsIcon() {
  return (
    <svg viewBox="0 0 24 24" {...iconProps}>
      <circle cx="8" cy="9" r="3" />
      <circle cx="16.5" cy="10" r="2.5" />
      <path d="M3.5 18c0-2.2 2.2-3.8 4.9-3.8h1.2c2.7 0 4.9 1.6 4.9 3.8" />
      <path d="M14.5 17.5c.4-1.5 1.9-2.5 3.9-2.5.8 0 1.5.1 2.1.4" />
    </svg>
  )
}

function FriendsIcon() {
  return (
    <svg viewBox="0 0 24 24" {...iconProps}>
      <circle cx="9" cy="8.5" r="3" />
      <circle cx="16.5" cy="8" r="2.5" />
      <path d="M4 18c0-2.5 2.4-4 5.2-4h.6c2.8 0 5.2 1.5 5.2 4" />
      <path d="M14.5 14.5c.7-.5 1.6-.8 2.7-.8 2 0 3.7 1 4.3 2.6" />
    </svg>
  )
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" {...iconProps}>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H19a1 1 0 0 1 1 1v10a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 16.5z" />
      <path d="M4 9h14" />
      <path d="M16 13h3" />
      <circle cx="15.5" cy="13" r=".6" fill="currentColor" stroke="none" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" {...iconProps}>
      <path d="M12 3.5v2.2" />
      <path d="m18.2 5.8-1.6 1.6" />
      <path d="M20.5 12h-2.2" />
      <path d="m18.2 18.2-1.6-1.6" />
      <path d="M12 20.5v-2.2" />
      <path d="m5.8 18.2 1.6-1.6" />
      <path d="M3.5 12h2.2" />
      <path d="m5.8 5.8 1.6 1.6" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  )
}
