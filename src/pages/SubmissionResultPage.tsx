import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getSubmission, type SubmissionResult } from '../api/submissions'
import { ApiError } from '../api/client'
import { useApiClient } from '../api/useApiClient'
import { Button } from '../components/ui/Button'
import { Notice } from '../components/ui/Notice'
import { PageHeading } from '../components/ui/PageHeading'

const refreshIntervalMs = 3000
const terminalStatuses = new Set(['SUBMISSION_STATUS_DONE', 'SUBMISSION_STATUS_FAILED', 'DONE', 'FAILED'])

const statusLabels: Record<string, string> = {
  SUBMISSION_STATUS_QUEUED: 'В очереди', QUEUED: 'В очереди',
  SUBMISSION_STATUS_COMPILING: 'Компиляция', COMPILING: 'Компиляция',
  SUBMISSION_STATUS_RUNNING: 'Выполняются тесты', RUNNING: 'Выполняются тесты',
  SUBMISSION_STATUS_DONE: 'Проверка завершена', DONE: 'Проверка завершена',
  SUBMISSION_STATUS_FAILED: 'Сбой системы проверки', FAILED: 'Сбой системы проверки',
}

const verdictLabels: Record<string, string> = {
  VERDICT_OK: 'Принято', OK: 'Принято',
  VERDICT_COMPILATION_ERROR: 'Ошибка компиляции', COMPILATION_ERROR: 'Ошибка компиляции',
  VERDICT_WRONG_ANSWER: 'Неверный ответ', WRONG_ANSWER: 'Неверный ответ',
  VERDICT_TIME_LIMIT_EXCEEDED: 'Превышено время', TIME_LIMIT_EXCEEDED: 'Превышено время',
  VERDICT_MEMORY_LIMIT_EXCEEDED: 'Превышена память', MEMORY_LIMIT_EXCEEDED: 'Превышена память',
  VERDICT_RUNTIME_ERROR: 'Ошибка выполнения', RUNTIME_ERROR: 'Ошибка выполнения',
  VERDICT_SYSTEM_ERROR: 'Сбой проверяющей системы', SYSTEM_ERROR: 'Сбой проверяющей системы',
}

function readable(value: string | undefined, labels: Record<string, string>, fallback = 'Ожидается') {
  if (!value || value.endsWith('_UNSPECIFIED')) return fallback
  return labels[value] ?? value
}

function errorMessage(error: unknown) {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Не удалось загрузить результат посылки.'
}

interface LoadState {
  id: string
  result?: SubmissionResult
  error?: string
  updatedAt?: Date
}

export function SubmissionResultPage() {
  const { submissionId = '' } = useParams()
  const api = useApiClient()
  const [load, setLoad] = useState<LoadState | null>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let requestInFlight = false
    const refresh = async () => {
      if (!active || document.visibilityState === 'hidden' || requestInFlight) return
      requestInFlight = true
      try {
        const result = await getSubmission(api, submissionId)
        if (!active) return
        setLoad({ id: submissionId, result, updatedAt: new Date() })
        if (!terminalStatuses.has(result.submission.status)) timer = setTimeout(() => void refresh(), refreshIntervalMs)
      } catch (error) {
        if (active) setLoad((current) => ({
          id: submissionId,
          result: current?.id === submissionId ? current.result : undefined,
          error: errorMessage(error),
          updatedAt: current?.updatedAt,
        }))
      } finally {
        requestInFlight = false
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (timer) clearTimeout(timer)
        void refresh()
      } else if (timer) clearTimeout(timer)
    }
    document.addEventListener('visibilitychange', onVisibility)
    setLoad(null)
    void refresh()
    return () => {
      active = false
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
    // The timer schedules polling without restarting the effect after each response.
  }, [api, submissionId, retry])

  const current = load?.id === submissionId ? load : null
  const submission = current?.result?.submission
  const finished = submission ? terminalStatuses.has(submission.status) : false

  return (
    <main className="page-shell results-page">
      <Link className="back-link" to="/submissions">← История посылок</Link>
      <PageHeading eyebrow="Результат проверки" title="Посылка" />
      <p className="result-id">ID: <code>{submissionId}</code></p>

      {!current?.result && !current?.error && <Notice title="Загружаем результат" role="status">Получаем данные проверки…</Notice>}
      {current?.error && <Notice title="Не удалось загрузить результат" tone="error" role="alert">
        <p>{current.error}</p><Button onClick={() => setRetry((n) => n + 1)}>Попробовать ещё раз</Button>
      </Notice>}
      {current?.result && submission && <>
        <section className="surface result-summary" aria-labelledby="summary-heading">
          <div className="section-heading-row"><h2 id="summary-heading">Состояние проверки</h2>
            <span className={`result-status ${finished ? 'result-status-finished' : ''}`} role="status">{readable(submission.status, statusLabels, 'Статус не указан')}</span>
          </div>
          <dl className="result-metrics">
            <div><dt>Итоговый вердикт</dt><dd>{readable(submission.verdict, verdictLabels)}</dd></div>
            <div><dt>Баллы</dt><dd>{submission.score ?? 'Ожидаются'}</dd></div>
            <div><dt>Максимальное время</dt><dd>{submission.maxTimeMs == null ? '—' : `${submission.maxTimeMs} мс`}</dd></div>
            <div><dt>Максимальная память</dt><dd>{submission.maxMemoryKb == null ? '—' : `${submission.maxMemoryKb} КБ`}</dd></div>
            <div><dt>Язык</dt><dd>{submission.languageId}</dd></div>
            <div><dt>Отправлено</dt><dd>{submission.createTime ? new Date(submission.createTime).toLocaleString('ru-RU') : '—'}</dd></div>
          </dl>
          {!finished && <p className="field-hint" aria-live="polite">Страница обновляется автоматически{current.updatedAt ? ` · обновлено ${current.updatedAt.toLocaleTimeString('ru-RU')}` : ''}.</p>}
          {submission.status === 'SUBMISSION_STATUS_FAILED' && <p className="result-warning">Проверяющая система сообщила о сбое. Итоговый вердикт может быть недоступен.</p>}
        </section>

        {submission.compileLog && <section className="surface result-section"><h2>Вывод компилятора</h2><pre className="result-log">{submission.compileLog}</pre></section>}

        <section className="surface result-section" aria-labelledby="tests-heading">
          <div className="section-heading-row"><h2 id="tests-heading">Результаты тестов</h2><span className="muted-copy">{current.result.testRuns.length} тестов</span></div>
          {current.result.testRuns.length === 0 ? <p className="muted-copy">{finished ? 'API не вернул результаты отдельных тестов.' : 'Результаты появятся после запуска тестов.'}</p> : (
            <div className="results-table-wrap"><table className="results-table"><thead><tr><th>Тест</th><th>Вердикт</th><th>Время</th><th>Память</th><th>Диагностика</th></tr></thead>
              <tbody>{current.result.testRuns.map((run) => <tr key={`${run.testCaseId}-${run.ordinal}`}>
                <th scope="row">#{run.ordinal}{run.isSample ? ' · пример' : ''}</th><td>{readable(run.verdict, verdictLabels)}</td><td>{run.timeMs} мс</td><td>{run.memoryKb} КБ</td>
                <td>{run.stderrTail ? <details><summary>stderr</summary><pre className="result-log">{run.stderrTail}</pre></details> : '—'}</td>
              </tr>)}</tbody>
            </table></div>
          )}
        </section>
        <p className="result-limitation">Вывод stdout программы не предоставляется API, поэтому сравнение ответа с эталоном здесь недоступно.</p>
      </>}
    </main>
  )
}
