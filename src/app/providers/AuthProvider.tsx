import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from 'firebase/auth'
import {
  createOrUpdateUserDocument,
  loginWithEmail,
  loginWithGoogle,
  logout as logoutService,
  registerWithEmail,
  onAuthChange,
} from '../../features/auth/services/authService'
import type { UserProfile } from '../../types/user'
import { AuthContext, type AuthContextValue } from './auth-context'

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthChange(async (nextUser) => {
      setUser(nextUser)
      if (nextUser) {
        const userProfile = await createOrUpdateUserDocument(nextUser)
        setProfile(userProfile)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      profile,
      loading,
      register: async (email, password, displayName) => {
        await registerWithEmail(email, password, displayName)
      },
      login: async (email, password) => {
        await loginWithEmail(email, password)
      },
      loginWithGoogle: async () => {
        await loginWithGoogle()
      },
      logout: async () => {
        await logoutService()
      },
    }),
    [user, profile, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
