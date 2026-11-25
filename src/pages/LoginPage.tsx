import { Link, Navigate, useLocation } from 'react-router-dom'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/useAuth'
import { PageHeading } from '../components/ui/PageHeading'
import { Button } from '../components/ui/Button'
import { Notice } from '../components/ui/Notice'

interface LoginLocationState {
  from?: { pathname?: string; search?: string }
}

export function LoginPage() {
  const auth = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const state = location.state as LoginLocationState | null
  const destination = state?.from?.pathname
    ? `${state.from.pathname}${state.from.search ?? ''}`
    : '/problems'

  if (auth.status === 'authenticated') return <Navigate to={destination} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    await auth.login(email.trim() || undefined)
    setPending(false)
  }

  return (
    <main className="page-shell narrow-page">
      <PageHeading eyebrow="Учетная запись" title="Войти в AutoCheck" />
      <section className="surface auth-surface">
        <p className="form-intro">Вход защищён Keycloak. Пароль вводится только на странице авторизации.</p>
        {auth.error && <Notice title="Не удалось начать вход" tone="error" role="alert">{auth.error}</Notice>}
        {!auth.configured ? (
          <Notice title="Авторизация не настроена" role="status">Укажите параметры Keycloak в `.env.local`.</Notice>
        ) : (
          <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
            <label className="form-field">
              <span className="field-label">Email <span className="optional-label">необязательно</span></span>
              <input
                className="text-input"
                type="email"
                autoComplete="username"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
              />
              <span className="field-hint">Email будет передан Keycloak для предварительного заполнения.</span>
            </label>
            <Button type="submit" disabled={pending || auth.status === 'loading'}>
              {pending ? 'Переходим…' : 'Продолжить в Keycloak'}
            </Button>
          </form>
        )}
        <nav className="auth-links" aria-label="Другие действия">
          <Link to="/forgot-password">Забыли пароль?</Link>
          <span>Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></span>
        </nav>
      </section>
    </main>
  )
}
