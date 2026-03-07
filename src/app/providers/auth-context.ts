import { createContext } from 'react'
import type { User } from 'firebase/auth'
import type { UserProfile } from '../../types/user'

export type AuthContextValue = {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  register: (email: string, password: string, displayName: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
