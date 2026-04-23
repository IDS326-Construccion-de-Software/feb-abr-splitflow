import { useState } from 'react'
import { cn } from '../../lib/utils/cn'

type UserAvatarProps = {
  name: string
  photoURL?: string | null
  size?: 'md' | 'lg'
  tone?: 'teal' | 'pink'
  className?: string
}

const sizeClasses = {
  md: 'h-11 w-11 text-sm',
  lg: 'h-12 w-12 text-sm',
}

const toneClasses = {
  teal: 'from-emerald-400 via-teal-500 to-cyan-500',
  pink: 'from-pink-400 via-rose-500 to-pink-500',
}

const UserAvatar = ({ name, photoURL, size = 'lg', tone = 'teal', className }: UserAvatarProps) => {
  const [failedPhotoURL, setFailedPhotoURL] = useState<string | null>(null)
  const initial = name.trim().charAt(0).toUpperCase() || 'A'
  const canShowImage = Boolean(photoURL && failedPhotoURL !== photoURL)

  if (photoURL && canShowImage) {
    return (
      <img
        src={photoURL}
        alt={`Foto de ${name || 'usuario'}`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailedPhotoURL(photoURL)}
        className={cn(
          'shrink-0 rounded-2xl object-cover shadow-sm ring-1 ring-white/70',
          sizeClasses[size],
          className,
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-semibold text-white shadow-sm',
        sizeClasses[size],
        toneClasses[tone],
        className,
      )}
    >
      {initial}
    </div>
  )
}

export default UserAvatar
