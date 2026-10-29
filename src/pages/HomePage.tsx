import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ButtonLink } from '../components/ui/Button'

export function HomePage() {
  const { status } = useAuth()
  return (
    <main className="page-shell home-page">
      <section className="hero" aria-labelledby="home-title">
        <div className="hero-copy">
          <span className="eyebrow">Платформа для учебных задач</span>
          <h1 id="home-title">Пишите код.<br /><span>Проверяйте решения.</span></h1>
          <p className="hero-description">
            Система помогает студентам отправлять программные решения, а преподавателям —
            проверять их на тестах.
          </p>
          <div className="hero-actions">
            <ButtonLink to="/problems">Перейти к заданиям</ButtonLink>
            {status === 'authenticated' ? (
              <Link className="text-link" to="/problems">Открыть каталог <span aria-hidden="true">→</span></Link>
            ) : (
              <Link className="text-link" to="/login">Войти <span aria-hidden="true">→</span></Link>
            )}
          </div>
        </div>
        <div className="hero-mark" aria-hidden="true">
          <div className="code-card">
            <div className="code-card-bar"><span /><span /><span /></div>
            <pre><code><span className="code-muted">01</span> <span className="code-purple">func</span> <span className="code-blue">solve</span>() {'{'}<br /><span className="code-muted">02</span>   <span className="code-purple">return</span> <span className="code-green">"accepted"</span><br /><span className="code-muted">03</span> {'}'}</code></pre>
            <div className="code-status"><span className="status-dot" /> Готово к проверке</div>
          </div>
          <span className="orbit orbit-one" />
          <span className="orbit orbit-two" />
        </div>
      </section>
      <section className="home-note" aria-label="О платформе">
        <span className="note-icon" aria-hidden="true">✓</span>
        <p>Решения проверяются автоматически по тестам задания.</p>
      </section>
    </main>
  )
}
