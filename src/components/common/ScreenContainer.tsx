import type { ReactNode } from 'react'
import { cn } from '../../lib/utils/cn'

type ScreenContainerProps = {
  title?: string
  subtitle?: string
  children: ReactNode
  className?: string
}

const ScreenContainer = ({ title, subtitle, children, className }: ScreenContainerProps) => {
  return (
    <div className={cn('mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 md:py-8', className)}>
      {title && (
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-teal-600">Splitwise Clone</p>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
        </header>
      )}
      {children}
    </div>
  )
}

export default ScreenContainer
