import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/ui/Button'
import { Notice } from '../components/ui/Notice'
import { PageHeading } from '../components/ui/PageHeading'

type RegistrationIntent = 'student' | 'author'

export function RegisterPage() {
  const auth = useAuth()
  const [intent, setIntent] = useState<RegistrationIntent | null>(null)
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!intent) {
      setFormError('Выберите сценарий регистрации.')
      return
    }
    setFormError(null)
    setPending(true)
    await auth.register()
    setPending(false)
  }

  if (auth.status === 'authenticated') {
    return (
      <main className="page-shell narrow-page">
        <PageHeading eyebrow="Учетная запись" title="Вы уже вошли" />
        <Notice title="Роли назначает сервер" role="status">
          Интерфейс не меняет роль существующей учётной записи. Доступ автора выдаётся администратором.
        </Notice>
      </main>
    )
  }

  return (
    <main className="page-shell narrow-page">
      <PageHeading eyebrow="Новая учетная запись" title="Регистрация" />
      <section className="surface auth-surface">
        <p className="form-intro">Создание аккаунта выполняется на защищённой странице Keycloak.</p>
        {auth.error && <Notice title="Не удалось открыть регистрацию" tone="error" role="alert">{auth.error}</Notice>}
        {!auth.configured ? (
          <Notice title="Авторизация не настроена" role="status">Укажите параметры Keycloak в `.env.local`.</Notice>
        ) : (
          <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
            <fieldset className="role-fieldset" aria-describedby="role-help">
              <legend className="field-label">Как вы планируете использовать AutoCheck?</legend>
              <div className="choice-grid">
                <label className={`choice-card${intent === 'student' ? ' selected' : ''}`}>
                  <input
                    type="radio"
                    name="registration-intent"
                    value="student"
                    checked={intent === 'student'}
                    onChange={() => setIntent('student')}
                  />
                  <span><strong>Я студент</strong><small>Решать учебные задания и смотреть результаты.</small></span>
                </label>
                <label className={`choice-card${intent === 'author' ? ' selected' : ''}`}>
                  <input
                    type="radio"
                    name="registration-intent"
                    value="author"
                    checked={intent === 'author'}
                    onChange={() => setIntent('author')}
                  />
                  <span><strong>Я преподаватель</strong><small>Работать с авторскими возможностями.</small></span>
                </label>
              </div>
              <span id="role-help" className="field-hint">Выбор описывает ваш сценарий и не назначает права.</span>
            </fieldset>
            {intent === 'author' && (
              <Notice title="Роль автора не назначается при регистрации" role="status">
                Настройка realm выдаёт новым аккаунтам роль `student`. Чтобы получить роль `author`, обратитесь к администратору после создания аккаунта.
              </Notice>
            )}
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <Button type="submit" disabled={pending || auth.status === 'loading'}>
              {pending ? 'Переходим…' : 'Продолжить в Keycloak'}
            </Button>
          </form>
        )}
        <p className="auth-switch">Уже есть аккаунт? <Link to="/login">Войти</Link></p>
      </section>
    </main>
  )
}
