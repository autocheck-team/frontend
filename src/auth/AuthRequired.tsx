import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
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
