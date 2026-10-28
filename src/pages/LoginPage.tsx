import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { LoginPrompt } from '../auth/AuthRequired'
import { PageHeading } from '../components/ui/PageHeading'

interface LoginLocationState {
  from?: { pathname?: string; search?: string }
}

export function LoginPage() {
  const auth = useAuth()
  const location = useLocation()
  const state = location.state as LoginLocationState | null
  const destination = state?.from?.pathname
    ? `${state.from.pathname}${state.from.search ?? ''}`
    : '/problems'

  if (auth.status === 'authenticated') return <Navigate to={destination} replace />

  return (
    <main className="page-shell narrow-page">
      <PageHeading eyebrow="Учетная запись" title="Войти в AutoCheck" />
      <section className="surface auth-surface">
        <LoginPrompt />
      </section>
    </main>
  )
}
