import { cn } from '../../lib/utils/cn'

type LoadingSpinnerProps = {
  label?: string
  className?: string
}

const LoadingSpinner = ({ label = 'Cargando...', className }: LoadingSpinnerProps) => {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-10', className)}>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-ocean-200 border-t-teal-600" />
      <p className="text-sm font-medium text-slate-600">{label}</p>
    </div>
  )
}

export default LoadingSpinner
