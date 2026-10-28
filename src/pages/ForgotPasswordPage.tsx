import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/ui/Button'
import { Notice } from '../components/ui/Notice'
import { PageHeading } from '../components/ui/PageHeading'

export function ForgotPasswordPage() {
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    await auth.startPasswordRecovery(email.trim())
    setPending(false)
  }

  return (
    <main className="page-shell narrow-page">
      <PageHeading eyebrow="Восстановление доступа" title="Забыли пароль?" />
      <section className="surface auth-surface">
        <p className="form-intro">
          Запрос пароля обрабатывает Keycloak. После перехода выберите «Забыли пароль?» на его странице входа.
        </p>
        <Notice title="Проверьте настройки почты" tone="error" role="note">
          В конфигурации локального realm включено восстановление, но SMTP для отправки письма не настроен. Ссылка для сброса не придёт, пока инфраструктура не получит настройки почты.
        </Notice>
        {auth.error && <Notice title="Не удалось открыть Keycloak" tone="error" role="alert">{auth.error}</Notice>}
        {!auth.configured ? (
          <Notice title="Авторизация не настроена" role="status">Укажите параметры Keycloak в `.env.local`.</Notice>
        ) : (
          <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
            <label className="form-field">
              <span className="field-label">Email</span>
              <input
                className="text-input"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
              />
            </label>
            <Button type="submit" disabled={pending || auth.status === 'loading'}>
              {pending ? 'Переходим…' : 'Открыть восстановление в Keycloak'}
            </Button>
          </form>
        )}
        <p className="auth-switch"><Link to="/login">Вернуться ко входу</Link></p>
      </section>
    </main>
  )
}
