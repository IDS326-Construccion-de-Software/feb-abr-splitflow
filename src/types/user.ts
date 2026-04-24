export type CurrencyCode = 'DOP' | 'USD' | string

export interface UserProfile {
  id?: string
  uid: string
  email: string
  displayName: string
  photoURL?: string | null
  phoneNumber?: string | null
  location?: string | null
  bio?: string | null
  currency?: CurrencyCode
  createdAt?: string | null
  updatedAt?: string | null
}
