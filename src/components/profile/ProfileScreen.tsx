import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { useFriendships } from '../../features/friends/hooks/useFriendships'
import { useGroups } from '../../features/groups/hooks/useGroups'
import LoadingSpinner from '../common/LoadingSpinner'
import { updateUserProfile } from '../../features/users/services/profileService'
import { uploadProfileImage } from '../../features/users/services/cloudinaryService'
import { navigateBack } from '../../lib/utils/navigation'
import { usePushNotifications } from '../../features/notifications/hooks/usePushNotifications'
import { getCurrencySymbol, normalizeCurrency } from '../../lib/utils/calculations'

const PHONE_MAX_DIGITS = 15

const getPhoneDigits = (value: string) => value.replace(/\D/g, '').slice(0, PHONE_MAX_DIGITS)

const formatPhoneNumber = (value: string) => {
  const digits = getPhoneDigits(value)
  if (!digits) return ''

  if (digits.length > 10) {
    const country = digits.slice(0, digits.length - 10)
    const area = digits.slice(-10, -7)
    const prefix = digits.slice(-7, -4)
    const line = digits.slice(-4)
    return `+${country} ${area}${prefix ? ` ${prefix}` : ''}${line ? ` ${line}` : ''}`.trim()
  }

  if (digits.length > 6) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  if (digits.length > 3) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  return digits
}

const ProfileScreen = () => {
  const { profile, user, loading, logout, refreshProfile } = useAuth()
  const { friendships, loading: friendsLoading } = useFriendships(user?.uid)
  const { groups, loading: groupsLoading } = useGroups(user?.uid)
  const pushNotifications = usePushNotifications(user?.uid)
  const [displayName, setDisplayName] = useState(profile?.displayName || '')
  const [currency, setCurrency] = useState(normalizeCurrency(profile?.currency))
  const [phoneNumber, setPhoneNumber] = useState(formatPhoneNumber(profile?.phoneNumber || ''))
  const [location, setLocation] = useState(profile?.location || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || null)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    setDisplayName(profile?.displayName || '')
    setCurrency(normalizeCurrency(profile?.currency))
    setPhoneNumber(formatPhoneNumber(profile?.phoneNumber || ''))
    setLocation(profile?.location || '')
    setBio(profile?.bio || '')
    setPhotoURL(profile?.photoURL || null)
  }, [profile?.displayName, profile?.currency, profile?.phoneNumber, profile?.location, profile?.bio, profile?.photoURL])

  const resetProfileDraft = () => {
    setDisplayName(profile?.displayName || '')
    setCurrency(normalizeCurrency(profile?.currency))
    setPhoneNumber(formatPhoneNumber(profile?.phoneNumber || ''))
    setLocation(profile?.location || '')
    setBio(profile?.bio || '')
    setMessage(null)
  }

  const onSave = async () => {
    const nextDisplayName = displayName.trim()
    const phoneDigits = getPhoneDigits(phoneNumber)
    const nextPhoneNumber = formatPhoneNumber(phoneDigits)
    const nextLocation = location.trim()
    const nextBio = bio.trim()

    if (nextDisplayName.length < 2) {
      setMessage('El nombre visible debe tener al menos 2 caracteres')
      return
    }

    if (phoneDigits.length > 0 && phoneDigits.length < 7) {
      setMessage('El telefono debe tener al menos 7 digitos')
      return
    }

    if (phoneDigits.length > PHONE_MAX_DIGITS) {
      setMessage('El telefono no debe pasar de 15 digitos')
      return
    }

    if (nextLocation.length > 80) {
      setMessage('La ubicacion no debe pasar de 80 caracteres')
      return
    }

    if (nextBio.length > 160) {
      setMessage('La biografia no debe pasar de 160 caracteres')
      return
    }

    try {
      setSaving(true)
      setMessage(null)
      await updateUserProfile({
        displayName: nextDisplayName,
        currency,
        phoneNumber: nextPhoneNumber || null,
        location: nextLocation || null,
        bio: nextBio || null,
      })
      await refreshProfile()
      setDisplayName(nextDisplayName)
      setPhoneNumber(nextPhoneNumber)
      setLocation(nextLocation)
      setBio(nextBio)
      setMessage('Perfil actualizado')
    } catch (err) {
      setMessage('No pudimos actualizar el perfil')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const onPhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      setUploadingPhoto(true)
      setMessage(null)
      const nextPhotoURL = await uploadProfileImage(file)
      await updateUserProfile({ photoURL: nextPhotoURL })
      await refreshProfile()
      setPhotoURL(nextPhotoURL)
      setMessage('Foto de perfil actualizada')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No pudimos actualizar la foto de perfil')
      console.error(err)
    } finally {
      setUploadingPhoto(false)
    }
  }

  const onRemovePhoto = async () => {
    try {
      setUploadingPhoto(true)
      setMessage(null)
      await updateUserProfile({ photoURL: null })
      await refreshProfile()
      setPhotoURL(null)
      setMessage('Foto de perfil eliminada')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No pudimos eliminar la foto de perfil')
      console.error(err)
    } finally {
      setUploadingPhoto(false)
    }
  }

  const friendsCount = useMemo(() => friendships.filter((item) => item.status === 'accepted').length, [friendships])
  const pendingCount = useMemo(() => friendships.filter((item) => item.status === 'pending').length, [friendships])
  const groupsCount = useMemo(() => groups.length, [groups])
  const showLoadingStats = friendsLoading || groupsLoading

  if (loading) return <LoadingSpinner label="Cargando perfil..." />

  const initial = profile?.displayName?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U'

  return (
    <div className="min-h-screen pb-24">
      <header className="relative overflow-hidden rounded-b-[2.2rem] bg-slate-950 text-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.9)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.18),transparent_30%)]" />
        <div className="relative mx-auto max-w-5xl px-4 pb-8 pt-5">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => navigateBack(navigate, '/dashboard')}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15"
              aria-label="Volver"
            >
              <BackIcon />
            </button>
            <span className="h-11 w-11" aria-hidden="true" />
          </div>

          <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-4">
              <ProfileAvatar photoURL={photoURL} initial={initial} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">Tu perfil</p>
                <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-[2.35rem]">
                  {profile?.displayName || 'Usuario'}
                </h1>
                <p className="mt-1 text-sm leading-6 text-slate-300">{profile?.email || 'Sin correo visible'}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 md:min-w-[420px]">
              <HeroMetric label="Grupos" value={showLoadingStats ? '...' : groupsCount.toString()} helper="Espacios activos" />
              <HeroMetric label="Amigos" value={showLoadingStats ? '...' : friendsCount.toString()} helper="Conexiones aceptadas" />
              <HeroMetric label="Pendientes" value={showLoadingStats ? '...' : pendingCount.toString()} helper="Solicitudes abiertas" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-6 grid max-w-5xl gap-5 px-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <section className="rounded-[2rem] border border-white/80 bg-white/[0.9] p-5 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Cuenta</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">Informacion personal</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Ajusta como quieres aparecer y la moneda que usaras por defecto en la app.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={resetProfileDraft}
                  disabled={saving}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <FieldRow
                label="Foto de perfil"
                helper="Sube una imagen JPG, PNG o WebP de hasta 2 MB. Se guarda en Cloudinary y aqui solo usamos la URL."
                control={
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <ProfileAvatar photoURL={photoURL} initial={initial} compact />
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110">
                        {uploadingPhoto ? 'Subiendo...' : photoURL ? 'Cambiar foto' : 'Subir foto'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          disabled={uploadingPhoto}
                          onChange={onPhotoChange}
                        />
                      </label>
                      {photoURL && (
                        <button
                          type="button"
                          onClick={onRemovePhoto}
                          disabled={uploadingPhoto}
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Quitar foto
                        </button>
                      )}
                    </div>
                  </div>
                }
              />

              <FieldRow
                label="Nombre visible"
                helper="Este nombre se muestra dentro de grupos, balances y listas."
                control={
                  <input
                    className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-slate-300"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                  />
                }
              />

              <FieldRow
                label="Correo"
                helper="Se usa para identificarte y recuperar acceso. Cambiarlo requiere un flujo seguro aparte."
                control={<StaticValue value={profile?.email || 'Sin correo visible'} />}
              />

              <FieldRow
                label="Telefono"
                helper="Opcional. Solo se guarda como dato de contacto en tu perfil."
                control={
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={20}
                    pattern="[0-9+ ]*"
                    placeholder="Ej: +1 809 000 0000"
                    className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-slate-300"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(formatPhoneNumber(event.target.value))}
                  />
                }
              />

              <FieldRow
                label="Ubicacion"
                helper="Opcional. Puedes poner ciudad, pais o una referencia corta."
                control={
                  <input
                    maxLength={80}
                    placeholder="Ej: Santo Domingo, RD"
                    className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-slate-300"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                  />
                }
              />

              <FieldRow
                label="Biografia"
                helper="Opcional. Una descripcion corta sobre ti para tu cuenta."
                control={
                  <textarea
                    rows={4}
                    maxLength={160}
                    placeholder="Ej: Me gusta mantener los gastos claros."
                    className="w-full resize-none rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-slate-300"
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                  />
                }
              />

              <FieldRow
                label="Moneda por defecto"
                helper="La app convierte y muestra saldos con esta moneda."
                control={
                  <select
                    className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-slate-300"
                    value={currency}
                    onChange={(event) => setCurrency(normalizeCurrency(event.target.value))}
                  >
                    <option value="DOP">Peso dominicano (RD$)</option>
                    <option value="USD">Dolares (US$)</option>
                  </select>
                }
              />
            </div>

            {message && (
              <div
                className={`mt-5 rounded-[1.35rem] px-4 py-3 text-sm ${
                  message === 'Perfil actualizado'
                  || message === 'Foto de perfil actualizada'
                  || message === 'Foto de perfil eliminada'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                {message}
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-white/80 bg-white/[0.9] p-5 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Navegacion</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">Accesos utiles</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Rapido</span>
            </div>

            <div className="mt-4 overflow-hidden rounded-[1.6rem] border border-slate-100">
              <ActionRow label="Gestionar amigos" description="Revisa solicitudes y agrega nuevos contactos." onClick={() => navigate('/friends')} />
              <ActionRow label="Ver balances" description="Consulta deudas, cobros y pagos manuales." onClick={() => navigate('/balances')} />
              <ActionRow
                label="Abrir grupos"
                description="Entra a tus grupos y revisa actividad."
                onClick={() => navigate('/groups')}
                withDivider={false}
              />
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-[2rem] border border-white/80 bg-white/[0.9] p-5 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Notificaciones</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">Solicitudes de amistad</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Recibe un aviso cuando alguien te envie una invitacion.
            </p>

            <div className="mt-4 space-y-3">
              <MiniInfo label="Estado" value={notificationStatusLabel(pushNotifications)} />

              {pushNotifications.error && (
                <div className="rounded-[1.35rem] border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-700">
                  {pushNotifications.error}
                </div>
              )}

              {pushNotifications.message && (
                <div className="rounded-[1.35rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-700">
                  {pushNotifications.message}
                </div>
              )}

              {pushNotifications.enabled ? (
                <button
                  onClick={pushNotifications.disable}
                  disabled={pushNotifications.actionLoading}
                  className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pushNotifications.actionLoading ? 'Desactivando...' : 'Desactivar notificaciones'}
                </button>
              ) : (
                <button
                  onClick={pushNotifications.enable}
                  disabled={!pushNotifications.supported || pushNotifications.actionLoading || pushNotifications.permission === 'denied'}
                  className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pushNotifications.actionLoading ? 'Activando...' : 'Activar notificaciones'}
                </button>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/80 bg-white/[0.9] p-5 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Estado</p>
            <div className="mt-4 space-y-3">
              <MiniInfo label="Perfil" value={saving ? 'Guardando' : 'Editable'} />
              <MiniInfo label="Moneda actual" value={getCurrencySymbol(currency)} />
              <MiniInfo label="Solicitudes pendientes" value={showLoadingStats ? '...' : pendingCount.toString()} />
            </div>
          </section>

          <button
            onClick={logout}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
          >
            <LogoutIcon />
            Cerrar sesion
          </button>
        </aside>
      </main>
    </div>
  )
}

export default ProfileScreen

const FieldRow = ({
  label,
  helper,
  control,
}: {
  label: string
  helper: string
  control: ReactNode
}) => (
  <div className="grid gap-3 rounded-[1.5rem] bg-slate-50 px-4 py-4 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
    <div>
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
    </div>
    {control}
  </div>
)

const StaticValue = ({ value }: { value: string }) => (
  <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm">
    {value}
  </div>
)

const ActionRow = ({
  label,
  description,
  onClick,
  withDivider = true,
}: {
  label: string
  description: string
  onClick: () => void
  withDivider?: boolean
}) => (
  <button
    onClick={onClick}
    className={`flex w-full items-center justify-between gap-4 bg-white px-4 py-4 text-left transition hover:bg-slate-50 ${
      withDivider ? 'border-b border-slate-100' : ''
    }`}
  >
    <div>
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </div>
    <ArrowRightIcon />
  </button>
)

const MiniInfo = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-[1.35rem] bg-slate-50 px-4 py-3">
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
  </div>
)

const HeroMetric = ({ label, value, helper }: { label: string; value: string; helper: string }) => (
  <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.06] px-4 py-4 backdrop-blur-sm">
    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300">{label}</p>
    <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    <p className="mt-1 text-xs leading-5 text-slate-300">{helper}</p>
  </div>
)

const ProfileAvatar = ({
  compact = false,
  initial,
  photoURL,
}: {
  compact?: boolean
  initial: string
  photoURL?: string | null
}) => {
  const size = compact ? 'h-14 w-14 rounded-[1.25rem] text-lg' : 'h-20 w-20 rounded-[2rem] text-2xl'
  const fallbackStyle = compact ? 'bg-slate-100 text-slate-700' : 'bg-white/12 text-white'

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt="Foto de perfil"
        className={`${size} shrink-0 object-cover shadow-sm ring-1 ring-white/50`}
      />
    )
  }

  return (
    <div className={`flex shrink-0 items-center justify-center font-semibold shadow-sm backdrop-blur ${fallbackStyle} ${size}`}>
      {initial}
    </div>
  )
}

const notificationStatusLabel = ({
  enabled,
  loading,
  permission,
  supported,
}: {
  enabled: boolean
  loading: boolean
  permission: string
  supported: boolean
}) => {
  if (loading) return 'Revisando...'
  if (!supported) return 'No compatible'
  if (permission === 'denied') return 'Bloqueadas'
  if (enabled) return 'Activas'
  if (permission === 'granted') return 'Inactivas'
  return 'Sin permiso'
}

const BackIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="m15 5-7 7 7 7" />
  </svg>
)

const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
)

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <path d="M10 17 15 12 10 7" />
    <path d="M15 12H3" />
  </svg>
)
