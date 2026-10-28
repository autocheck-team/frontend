import { createContext } from 'react'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'error'

export interface AuthContextValue {
  status: AuthStatus
  configured: boolean
  error: string | null
  login: () => Promise<void>
  logout: () => Promise<void>
  getAccessToken: () => Promise<string | undefined>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
