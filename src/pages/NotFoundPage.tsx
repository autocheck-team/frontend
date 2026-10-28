import { Link } from 'react-router-dom'
import { PageHeading } from '../components/ui/PageHeading'

export function NotFoundPage() {
  return (
    <main className="page-shell narrow-page">
      <PageHeading eyebrow="Ошибка 404" title="Страница не найдена" />
      <p className="page-description">Проверьте адрес или вернитесь на главную страницу.</p>
      <Link className="text-link" to="/">На главную <span aria-hidden="true">→</span></Link>
    </main>
  )
}
