import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Markdown from 'react-markdown'
import { ApiError } from '../api/client'
import { getProblem, listLanguages, listProblemTestCases, type Problem, type TestCase } from '../api/problems'
import { useApiClient } from '../api/useApiClient'
import { Button } from '../components/ui/Button'
import { Notice } from '../components/ui/Notice'
import { PageHeading } from '../components/ui/PageHeading'

interface ProblemDetails {
  problem: Problem
  samples: TestCase[]
  languageNames: Map<string, string>
  languagesUnavailable: boolean
}

interface ProblemResult {
  id: string
  retry: number
  details?: ProblemDetails
  error?: string
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function messageFor(error: unknown) {
  return error instanceof ApiError || error instanceof Error
    ? error.message
    : 'Не удалось загрузить задание. Попробуйте ещё раз.'
}

function formatMemory(memoryLimitKb: number) {
  return memoryLimitKb >= 1024
    ? `${Number((memoryLimitKb / 1024).toFixed(1))} МБ`
    : `${memoryLimitKb} КБ`
}

export function ProblemPage() {
  const { problemId = '' } = useParams()
  const api = useApiClient()
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState<ProblemResult | null>(null)

  useEffect(() => {
    if (!isUuid(problemId)) return
    let active = true
    void Promise.all([
      getProblem(api, problemId),
      listProblemTestCases(api, problemId),
      listLanguages(api).then(
        (languages) => ({ languages, unavailable: false }),
        () => ({ languages: [], unavailable: true }),
      ),
    ])
      .then(([problem, testCases, languageResult]) => {
        if (!active) return
        setResult({
          id: problemId,
          retry,
          details: {
            problem,
            samples: testCases.filter((testCase) => testCase.isSample && testCase.isReady),
            languageNames: new Map(languageResult.languages.map((language) => [language.id, language.name])),
            languagesUnavailable: languageResult.unavailable,
          },
        })
      })
      .catch((error: unknown) => {
        if (active) setResult({ id: problemId, retry, error: messageFor(error) })
      })
    return () => { active = false }
  }, [api, problemId, retry])

  const currentResult = result?.id === problemId && result.retry === retry ? result : null
  const checkerName = useMemo(() => {
    const checker = currentResult?.details?.problem.checker
    return checker?.replace(/^CHECKER_/, '').toLocaleLowerCase()
  }, [currentResult])

  if (!isUuid(problemId)) {
    return (
      <main className="page-shell narrow-page">
        <PageHeading eyebrow="Задание" title="Некорректная ссылка" />
        <Notice title="Идентификатор задания некорректен" tone="error" role="alert">
          <Link className="text-link" to="/problems">Вернуться в каталог</Link>
        </Notice>
      </main>
    )
  }

  if (!currentResult) {
    return (
      <main className="page-shell problem-detail-page">
        <Link className="back-link" to="/problems">← Каталог заданий</Link>
        <Notice title="Загружаем задание" role="status">Получаем условие и примеры…</Notice>
      </main>
    )
  }

  if (currentResult.error || !currentResult.details) {
    return (
      <main className="page-shell problem-detail-page">
        <Link className="back-link" to="/problems">← Каталог заданий</Link>
        <Notice title="Не удалось загрузить задание" tone="error" role="alert">
          <p>{currentResult.error ?? 'Данные задания недоступны.'}</p>
          <Button onClick={() => setRetry((value) => value + 1)}>Попробовать ещё раз</Button>
        </Notice>
      </main>
    )
  }

  const { problem, samples, languageNames, languagesUnavailable } = currentResult.details

  return (
    <main className="page-shell problem-detail-page">
      <Link className="back-link" to="/problems">← Каталог заданий</Link>
      <header className="problem-detail-header">
        <PageHeading eyebrow={`Задание /${problem.slug}`} title={problem.title} />
        <div className="problem-limits" aria-label="Ограничения задания">
          <div><span>Время на тест</span><strong>{problem.timeLimitMs < 1000 ? `${problem.timeLimitMs} мс` : `${problem.timeLimitMs / 1000} с`}</strong></div>
          <div><span>Память</span><strong>{formatMemory(problem.memoryLimitKb)}</strong></div>
        </div>
      </header>

      <section className="detail-section statement-section">
        <h2>Условие</h2>
        <article className="markdown-content"><Markdown>{problem.statement}</Markdown></article>
      </section>

      <section className="detail-section">
        <div className="section-heading-row">
          <h2>Разрешённые языки</h2>
          {checkerName && <span className="checker-chip">Проверка: {checkerName}</span>}
        </div>
        {problem.languageIds.length ? (
          <ul className="language-list">
            {problem.languageIds.map((languageId) => (
              <li key={languageId}>{languageNames.get(languageId) ?? languageId}</li>
            ))}
          </ul>
        ) : <p className="muted-copy">Языки не указаны.</p>}
        {languagesUnavailable && <p className="field-hint">Не удалось загрузить названия; показаны идентификаторы из задания.</p>}
      </section>

      <section className="detail-section samples-section">
        <div className="section-heading-row">
          <h2>Примеры тестов</h2>
          <span className="sample-count">{samples.length}</span>
        </div>
        {samples.length === 0 ? (
          <Notice title="Открытые примеры отсутствуют" role="status">
            У задания пока нет опубликованных открытых тестов.
          </Notice>
        ) : (
          <div className="sample-list">
            {samples.map((sample) => (
              <article className="sample-card" key={sample.id}>
                <div className="sample-card-title"><h3>Пример {sample.ordinal}</h3><span>{sample.points} б.</span></div>
                <div className="sample-downloads">
                  {sample.inputDownloadUrl && <a href={sample.inputDownloadUrl} target="_blank" rel="noreferrer">Скачать входные данные</a>}
                  {sample.expectedDownloadUrl && <a href={sample.expectedDownloadUrl} target="_blank" rel="noreferrer">Скачать ожидаемый вывод</a>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
