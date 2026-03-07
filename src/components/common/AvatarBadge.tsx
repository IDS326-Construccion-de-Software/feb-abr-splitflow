type AvatarBadgeProps = {
  label: string
  sublabel?: string
  size?: 'sm' | 'md'
  color?: 'teal' | 'sky' | 'pink' | 'amber'
}

const palette: Record<string, { bg: string; text: string }> = {
  teal: { bg: 'bg-teal-100', text: 'text-teal-700' },
  sky: { bg: 'bg-sky-100', text: 'text-sky-700' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-700' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-700' },
}

const AvatarBadge = ({ label, sublabel, size = 'md', color = 'teal' }: AvatarBadgeProps) => {
  const initial = label?.[0]?.toUpperCase() ?? '?'
  const paletteColor = palette[color] || palette.teal
  const sizing = size === 'sm' ? 'h-8 w-8 text-sm' : 'h-10 w-10 text-base'

  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center justify-center rounded-full ${paletteColor.bg} ${paletteColor.text} ${sizing} font-semibold`}>
        {initial}
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        {sublabel && <p className="text-xs text-slate-500">{sublabel}</p>}
      </div>
    </div>
  )
}

export default AvatarBadge
