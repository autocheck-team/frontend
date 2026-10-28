import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api/client'
import { listProblems, type Problem } from '../api/problems'
import { useApiClient } from '../api/useApiClient'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/ui/Button'
import { Notice } from '../components/ui/Notice'
import { PageHeading } from '../components/ui/PageHeading'

interface ProblemListResult {
  key: string
  problems?: Problem[]
  nextPageToken?: string
  error?: string
}

function messageFor(error: unknown) {
  return error instanceof ApiError || error instanceof Error
    ? error.message
    : 'Не удалось загрузить каталог. Попробуйте ещё раз.'
}

function formatMemory(memoryLimitKb: number) {
  return memoryLimitKb >= 1024
    ? `${Number((memoryLimitKb / 1024).toFixed(1))} МБ`
    : `${memoryLimitKb} КБ`
}

function PageControls({
  pageIndex,
  hasNext,
  onPrevious,
  onNext,
}: {
  pageIndex: number
  hasNext: boolean
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <nav className="pagination" aria-label="Страницы каталога">
      <Button className="button-secondary" disabled={pageIndex === 0} onClick={onPrevious}>Назад</Button>
      <span>Страница {pageIndex + 1}</span>
      <Button className="button-secondary" disabled={!hasNext} onClick={onNext}>Дальше</Button>
    </nav>
  )
}

export function ProblemsPage() {
  const api = useApiClient()
  const auth = useAuth()
  const canShowMineFilter = auth.hasRole('author') || auth.hasRole('admin')
  const [onlyMine, setOnlyMine] = useState(false)
  const [search, setSearch] = useState('')
  const [pageTokens, setPageTokens] = useState<string[]>([''])
  const [pageIndex, setPageIndex] = useState(0)
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState<ProblemListResult | null>(null)
  const pageToken = pageTokens[pageIndex] ?? ''
  const requestKey = JSON.stringify([pageToken, onlyMine && canShowMineFilter, retry])

  useEffect(() => {
    let active = true
    void listProblems(api, { pageToken, onlyMine: onlyMine && canShowMineFilter, pageSize: 20 })
      .then((response) => {
        if (!active) return
        setResult({
          key: requestKey,
          problems: response.problems ?? [],
          nextPageToken: response.nextPageToken,
        })
      })
      .catch((error: unknown) => {
        if (active) setResult({ key: requestKey, error: messageFor(error) })
      })
    return () => { active = false }
  }, [api, canShowMineFilter, onlyMine, pageToken, requestKey])

  const currentResult = result?.key === requestKey ? result : null
  const visibleProblems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    const problems = currentResult?.problems ?? []
    if (!term) return problems
    return problems.filter((problem) =>
      `${problem.title} ${problem.slug}`.toLocaleLowerCase().includes(term),
    )
  }, [currentResult, search])

  function changeMineFilter(checked: boolean) {
    setOnlyMine(checked)
    setPageTokens([''])
    setPageIndex(0)
  }

  function showNextPage() {
    const nextToken = currentResult?.nextPageToken
    if (!nextToken) return
    setPageTokens((tokens) => [...tokens.slice(0, pageIndex + 1), nextToken])
    setPageIndex((index) => index + 1)
  }

  return (
    <main className="page-shell problems-page">
      <div className="catalog-heading">
        <PageHeading eyebrow="Практика программирования" title="Каталог заданий" />
        <p className="page-description">Выберите задачу, изучите условие и проверьте решение на примерах.</p>
      </div>

      <section className="catalog-controls" aria-label="Фильтры каталога">
        <label className="search-field">
          <span className="visually-hidden">Поиск по текущей странице</span>
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            className="text-input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Найти по названию или slug"
          />
        </label>
        {canShowMineFilter && (
          <label className="filter-toggle">
            <input type="checkbox" checked={onlyMine} onChange={(event) => changeMineFilter(event.target.checked)} />
            <span>Только мои задания</span>
          </label>
        )}
      </section>
      <p className="filter-caption">Поиск применяется к загруженной странице; сервер поддерживает фильтр «только мои» и постраничную выдачу.</p>

      {!currentResult ? (
        <Notice title="Загружаем задания" role="status">Получаем доступные задания…</Notice>
      ) : currentResult.error ? (
        <Notice title="Не удалось загрузить каталог" tone="error" role="alert">
          <p>{currentResult.error}</p>
          <Button onClick={() => setRetry((value) => value + 1)}>Попробовать ещё раз</Button>
        </Notice>
      ) : visibleProblems.length === 0 ? (
        <>
          <Notice title={search.trim() ? 'Совпадений нет на этой странице' : 'Заданий пока нет'} role="status">
            {search.trim()
              ? 'Измените запрос или перейдите на следующую страницу каталога.'
              : onlyMine
                ? 'У вас пока нет авторских заданий.'
                : 'Когда задания станут доступны, они появятся здесь.'}
          </Notice>
          {(currentResult.nextPageToken || pageIndex > 0) && (
            <PageControls
              pageIndex={pageIndex}
              hasNext={Boolean(currentResult.nextPageToken)}
              onPrevious={() => setPageIndex((index) => Math.max(0, index - 1))}
              onNext={showNextPage}
            />
          )}
        </>
      ) : (
        <>
          <div className="problem-grid" aria-live="polite">
            {visibleProblems.map((problem) => (
              <article className="problem-card" key={problem.id}>
                <div className="problem-card-top">
                  <span className="problem-slug">/{problem.slug}</span>
                  <span className="problem-tests">{problem.readyTestCount} {problem.readyTestCount === 1 ? 'тест' : 'тестов'}</span>
                </div>
                <h2><Link to={`/problems/${encodeURIComponent(problem.id)}`}>{problem.title}</Link></h2>
                <p className="problem-summary">{problem.statement.replace(/[#*_`>]/g, '').slice(0, 150) || 'Откройте задание, чтобы посмотреть условие.'}</p>
                <div className="problem-card-meta">
                  <span>Время: {problem.timeLimitMs < 1000 ? `${problem.timeLimitMs} мс` : `${problem.timeLimitMs / 1000} с`}</span>
                  <span>Память: {formatMemory(problem.memoryLimitKb)}</span>
                </div>
                <Link className="problem-open-link" to={`/problems/${encodeURIComponent(problem.id)}`}>
                  Открыть задание <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
          <PageControls
            pageIndex={pageIndex}
            hasNext={Boolean(currentResult.nextPageToken)}
            onPrevious={() => setPageIndex((index) => Math.max(0, index - 1))}
            onNext={showNextPage}
          />
        </>
      )}
    </main>
  )
}
