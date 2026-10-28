import Keycloak, { type KeycloakInstance } from 'keycloak-js'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { oidcConfig, oidcConfigError } from './config'
import { AuthContext, type AuthContextValue, type AuthStatus } from './context'

const keycloak = oidcConfig ? new Keycloak(oidcConfig) : null
let keycloakInit: Promise<boolean> | null = null

function initializeKeycloak() {
  if (!keycloak) return Promise.resolve(false)
  keycloakInit ??= keycloak.init({
    onLoad: 'check-sso',
    pkceMethod: 'S256',
    checkLoginIframe: false,
    enableLogging: false,
  })
  return keycloakInit
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() => oidcConfig ? 'loading' : 'anonymous')
  const [error, setError] = useState<string | null>(() =>
    oidcConfigError ? 'Проверьте параметры OIDC в .env.local.' : null,
  )
  const [client, setClient] = useState<KeycloakInstance | null>(null)

  useEffect(() => {
    if (!oidcConfig) {
      return
    }

    let active = true
    void initializeKeycloak()
      .then((authenticated) => {
        if (!active) return
        setClient(keycloak)
        setStatus(authenticated ? 'authenticated' : 'anonymous')
      })
      .catch(() => {
        if (!active) return
        setError('Не удалось подключиться к сервису авторизации. Проверьте его доступность и настройки.')
        setStatus('error')
      })

    return () => {
      active = false
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      configured: Boolean(oidcConfig),
      error,
      login: async () => {
        if (!client) {
          setError('Авторизация пока не инициализирована.')
          setStatus('error')
          return
        }
        try {
          await client.login({ redirectUri: window.location.href })
        } catch {
          setError('Не удалось открыть сервис авторизации.')
          setStatus('error')
        }
      },
      logout: async () => {
        if (!client) return
        try {
          await client.logout({ redirectUri: window.location.origin })
        } catch {
          setError('Не удалось завершить сеанс авторизации.')
          setStatus('error')
        }
      },
      getAccessToken: async () => {
        if (!client?.authenticated || !client.token) return undefined
        try {
          await client.updateToken(30)
          return client.token
        } catch {
          setStatus('error')
          setError('Сеанс авторизации истёк. Войдите снова.')
          return undefined
        }
      },
    }),
    [client, error, status],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
