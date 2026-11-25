import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api/client'
import { listSubmissions, type Submission } from '../api/submissions'
import { listProblems, type Problem } from '../api/problems'
import { useApiClient } from '../api/useApiClient'
import { Button } from '../components/ui/Button'
import { Notice } from '../components/ui/Notice'
import { PageHeading } from '../components/ui/PageHeading'

const verdictLabels: Record<string, string> = {
  VERDICT_OK: 'Принято', VERDICT_COMPILATION_ERROR: 'Ошибка компиляции',
  VERDICT_WRONG_ANSWER: 'Неверный ответ', VERDICT_TIME_LIMIT_EXCEEDED: 'Превышено время',
  VERDICT_MEMORY_LIMIT_EXCEEDED: 'Превышена память', VERDICT_RUNTIME_ERROR: 'Ошибка выполнения',
  VERDICT_SYSTEM_ERROR: 'Сбой системы', VERDICT_UNSPECIFIED: 'Ожидается',
}
const statusLabels: Record<string, string> = {
  SUBMISSION_STATUS_QUEUED: 'В очереди', SUBMISSION_STATUS_COMPILING: 'Компиляция',
  SUBMISSION_STATUS_RUNNING: 'Выполняются тесты', SUBMISSION_STATUS_DONE: 'Завершена',
  SUBMISSION_STATUS_FAILED: 'Сбой системы',
}

function messageFor(error: unknown) {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Не удалось загрузить историю посылок.'
}

async function loadVisibleProblems(api: ReturnType<typeof useApiClient>) {
  const all: Problem[] = []
  let pageToken: string | undefined
  do {
    const page = await listProblems(api, { pageSize: 100, pageToken })
    all.push(...(page.problems ?? []))
    pageToken = page.nextPageToken || undefined
  } while (pageToken)
  return all
}

interface HistoryResult {
  key: string
  submissions: Submission[]
  nextPageToken?: string
  error?: string
}

export function SubmissionHistoryPage() {
  const api = useApiClient()
  const [problems, setProblems] = useState<Problem[] | null>(null)
  const [problemError, setProblemError] = useState<string | null>(null)
  const [problemId, setProblemId] = useState('')
  const [verdict, setVerdict] = useState('')
  const [pageTokens, setPageTokens] = useState<string[]>([''])
  const [pageIndex, setPageIndex] = useState(0)
  const [retry, setRetry] = useState(0)
  const pageToken = pageTokens[pageIndex] ?? ''
  const key = `${problemId}:${pageToken}:${retry}`
  const [result, setResult] = useState<HistoryResult | null>(null)

  useEffect(() => {
    let active = true
    void loadVisibleProblems(api)
      .then((items) => { if (active) setProblems(items) })
      .catch((error: unknown) => { if (active) setProblemError(messageFor(error)) })
    return () => { active = false }
  }, [api])

  useEffect(() => {
    let active = true
    void listSubmissions(api, { pageSize: 20, problemId: problemId || undefined, pageToken: pageToken || undefined })
      .then((page) => {
        if (active) setResult({ key, submissions: page.submissions ?? [], nextPageToken: page.nextPageToken })
      })
      .catch((error: unknown) => { if (active) setResult({ key, submissions: [], error: messageFor(error) }) })
    return () => { active = false }
  }, [api, key, pageToken, problemId])

  const current = result?.key === key ? result : null
  const problemById = useMemo(() => new Map((problems ?? []).map((problem) => [problem.id, problem])), [problems])
  const visibleSubmissions = useMemo(() => {
    const items = current?.submissions ?? []
    return verdict ? items.filter((submission) => submission.verdict === verdict) : items
  }, [current, verdict])

  function changeProblem(value: string) {
    setProblemId(value)
    setPageTokens([''])
    setPageIndex(0)
  }

  function nextPage() {
    if (!current?.nextPageToken) return
    const next = pageIndex + 1
    setPageTokens((tokens) => [...tokens.slice(0, next), current.nextPageToken!])
    setPageIndex(next)
  }

  return (
    <main className="page-shell history-page">
      <PageHeading eyebrow="Мои решения" title="История посылок" />
      <section className="history-filters" aria-label="Фильтры истории посылок">
        <label className="form-field">
          <span className="field-label">Задание</span>
          <select className="text-input" value={problemId} onChange={(event) => changeProblem(event.target.value)}>
            <option value="">Все задания</option>
            {(problems ?? []).map((problem) => <option value={problem.id} key={problem.id}>{problem.title}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span className="field-label">Вердикт на этой странице</span>
          <select className="text-input" value={verdict} onChange={(event) => setVerdict(event.target.value)}>
            <option value="">Все вердикты</option>
            {Object.entries(verdictLabels).filter(([value]) => value !== 'VERDICT_UNSPECIFIED').map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
      </section>
      <p className="filter-caption">Фильтр по заданию применяется сервером. Вердикт фильтрует только текущую загруженную страницу. Если автор задания выберет своё задание, API вернёт посылки всех участников.</p>
      {problemError && <Notice title="Не удалось загрузить список заданий для фильтра" tone="error" role="alert">{problemError}</Notice>}

      {!current ? <Notice title="Загружаем историю" role="status">Получаем посылки из API…</Notice> : current.error ? (
        <Notice title="Не удалось загрузить историю" tone="error" role="alert"><p>{current.error}</p><Button onClick={() => setRetry((value) => value + 1)}>Попробовать ещё раз</Button></Notice>
      ) : current.submissions.length === 0 ? (
        <Notice title={problemId ? 'Для этого задания посылок нет' : 'Посылок пока нет'} role="status">
          {problemId ? 'Попробуйте выбрать другое задание.' : 'Отправленные решения появятся здесь.'}
        </Notice>
      ) : visibleSubmissions.length === 0 ? (
        <>
          <Notice title="На этой странице нет посылок с таким вердиктом" role="status">Снимите фильтр вердикта или перейдите на другую страницу.</Notice>
          <nav className="pagination" aria-label="Страницы истории посылок">
            <Button className="button-secondary" disabled={pageIndex === 0} onClick={() => setPageIndex((index) => Math.max(0, index - 1))}>Назад</Button>
            <span>Страница {pageIndex + 1}</span>
            <Button className="button-secondary" disabled={!current.nextPageToken} onClick={nextPage}>Дальше</Button>
          </nav>
        </>
      ) : (
        <>
          <div className="history-table-wrap"><table className="history-table"><thead><tr><th>Задание</th><th>Дата</th><th>Язык</th><th>Статус</th><th>Вердикт</th><th></th></tr></thead>
            <tbody>{visibleSubmissions.map((submission) => {
              const problem = problemById.get(submission.problemId)
              return <tr key={submission.id}>
                <td>{problem ? <Link to={`/problems/${encodeURIComponent(problem.id)}`}>{problem.title}</Link> : <span title={submission.problemId}>Задание ({submission.problemId.slice(0, 8)}…)</span>}</td>
                <td>{submission.createTime ? new Date(submission.createTime).toLocaleString('ru-RU') : '—'}</td>
                <td>{submission.languageId}</td>
                <td>{statusLabels[submission.status] ?? submission.status}</td>
                <td>{verdictLabels[submission.verdict] ?? submission.verdict}</td>
                <td><Link className="text-link" to={`/submissions/${encodeURIComponent(submission.id)}`}>Результат</Link></td>
              </tr>
            })}</tbody>
          </table></div>
          <nav className="pagination" aria-label="Страницы истории посылок">
            <Button className="button-secondary" disabled={pageIndex === 0} onClick={() => setPageIndex((index) => Math.max(0, index - 1))}>Назад</Button>
            <span>Страница {pageIndex + 1}</span>
            <Button className="button-secondary" disabled={!current.nextPageToken} onClick={nextPage}>Дальше</Button>
          </nav>
        </>
      )}
    </main>
  )
}
