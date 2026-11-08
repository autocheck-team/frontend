import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api/client'
import { listAuthorProblems } from '../api/author'
import type { Problem } from '../api/problems'
import { useApiClient } from '../api/useApiClient'
import { ButtonLink, Button } from '../components/ui/Button'
import { Notice } from '../components/ui/Notice'
import { PageHeading } from '../components/ui/PageHeading'

interface PageResult {
  key: string
  problems: Problem[]
  nextPageToken?: string
  error?: string
}

function errorMessage(error: unknown) {
  return error instanceof ApiError || error instanceof Error
    ? error.message
    : 'Не удалось загрузить список заданий.'
}

export function AuthorProblemsPage() {
  const api = useApiClient()
  const [pageTokens, setPageTokens] = useState<string[]>([''])
  const [pageIndex, setPageIndex] = useState(0)
  const [retry, setRetry] = useState(0)
  const key = `${pageTokens[pageIndex] ?? ''}:${retry}`
  const [result, setResult] = useState<PageResult | null>(null)

  useEffect(() => {
    let active = true
    void listAuthorProblems(api, pageTokens[pageIndex] || undefined)
      .then((page) => {
        if (active) setResult({ key, problems: page.problems ?? [], nextPageToken: page.nextPageToken })
      })
      .catch((error: unknown) => {
        if (active) setResult({ key, problems: [], error: errorMessage(error) })
      })
    return () => { active = false }
  }, [api, key, pageIndex, pageTokens])

  const current = result?.key === key ? result : null
  function nextPage() {
    if (!current?.nextPageToken) return
    const nextIndex = pageIndex + 1
    setPageTokens((tokens) => [...tokens.slice(0, nextIndex), current.nextPageToken!])
    setPageIndex(nextIndex)
  }

  return (
    <main className="page-shell author-page">
      <div className="author-heading-row">
        <PageHeading eyebrow="Рабочее пространство" title="Мои задания" />
        <ButtonLink to="/author/problems/new">Создать задание</ButtonLink>
      </div>

      {!current ? (
        <Notice title="Загружаем задания" role="status">Получаем список из API…</Notice>
      ) : current.error ? (
        <Notice title="Не удалось загрузить задания" tone="error" role="alert">
          <p>{current.error}</p>
          <Button onClick={() => setRetry((value) => value + 1)}>Попробовать ещё раз</Button>
        </Notice>
      ) : current.problems.length === 0 ? (
        <Notice title="Заданий пока нет" role="status">
          Создайте задание, затем добавьте тесты, чтобы подготовить его к публикации.
        </Notice>
      ) : (
        <>
          <div className="author-problem-list">
            {current.problems.map((problem) => (
              <article className="author-problem-row" key={problem.id}>
                <div>
                  <span className="problem-slug">/{problem.slug}</span>
                  <h2><Link to={`/author/problems/${encodeURIComponent(problem.id)}`}>{problem.title}</Link></h2>
                  <p>{problem.readyTestCount} готовых тестов · {problem.isPublished ? 'опубликовано' : 'черновик'}</p>
                </div>
                <Link className="problem-open-link" to={`/author/problems/${encodeURIComponent(problem.id)}`}>
                  Управлять <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
          <div className="pagination" aria-label="Страницы заданий">
            <Button className="button-secondary" disabled={pageIndex === 0} onClick={() => setPageIndex((index) => Math.max(0, index - 1))}>Назад</Button>
            <span>Страница {pageIndex + 1}</span>
            <Button className="button-secondary" disabled={!current.nextPageToken} onClick={nextPage}>Дальше</Button>
          </div>
        </>
      )}
    </main>
  )
}
