import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { Button } from '../components/ui/Button'
import { Notice } from '../components/ui/Notice'

export function AuthRequired({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === 'loading') {
    return <Notice title="Проверяем авторизацию" role="status">Пожалуйста, подождите.</Notice>
  }

  if (auth.status === 'error') {
    return <Notice title="Ошибка авторизации" tone="error" role="alert">{auth.error}</Notice>
  }

  if (auth.status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

export function LoginPrompt() {
  const auth = useAuth()

  if (auth.status === 'loading') {
    return <Notice title="Проверяем авторизацию" role="status">Пожалуйста, подождите.</Notice>
  }

  if (!auth.configured) {
    return (
      <Notice title="Авторизация не настроена" tone={auth.error ? 'error' : 'neutral'} role={auth.error ? 'alert' : 'status'}>
        {auth.error ?? 'Укажите параметры Keycloak в .env.local, чтобы войти в систему.'}
      </Notice>
    )
  }

  return (
    <div className="auth-prompt">
      <p>Для продолжения войдите через учетную запись AutoCheck.</p>
      <Button onClick={() => void auth.login()}>Войти через Keycloak</Button>
    </div>
  )
}
