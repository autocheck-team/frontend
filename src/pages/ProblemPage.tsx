import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Markdown from 'react-markdown'
import { ApiError } from '../api/client'
import { getProblem, listLanguages, listProblemTestCases, type Problem, type TestCase } from '../api/problems'
import { useApiClient } from '../api/useApiClient'
import { Button } from '../components/ui/Button'
import { Notice } from '../components/ui/Notice'
import { PageHeading } from '../components/ui/PageHeading'
import { ButtonLink } from '../components/ui/Button'

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
  const [downloads, setDownloads] = useState<Record<string, { busy: boolean; error?: string }>>({})

  async function downloadSampleFile(
    url: string,
    key: string,
    filename: string,
    testCaseId: string,
    fileKind: 'input' | 'expected',
  ) {
    setDownloads((current) => ({ ...current, [key]: { busy: true } }))
    try {
      let response = await fetch(url)
      if (response.status === 403) {
        const freshTestCases = await listProblemTestCases(api, problemId)
        const freshTestCase = freshTestCases.find((testCase) => testCase.id === testCaseId)
        const freshUrl = fileKind === 'input' ? freshTestCase?.inputDownloadUrl : freshTestCase?.expectedDownloadUrl
        if (freshUrl) response = await fetch(freshUrl)
      }
      if (!response.ok) {
        throw new Error(response.status === 403
          ? 'Ссылка на файл истекла. Обновите страницу задания и попробуйте снова.'
          : `Хранилище не отдало файл (HTTP ${response.status}).`)
      }
      const objectUrl = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = filename
      link.style.display = 'none'
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
      setDownloads((current) => ({ ...current, [key]: { busy: false } }))
    } catch (error) {
      setDownloads((current) => ({
        ...current,
        [key]: {
          busy: false,
          error: error instanceof Error && error.message
            ? error.message
            : 'Не удалось получить файл. Проверьте доступность хранилища и CORS для GET-запросов с localhost:5173.',
        },
      }))
    }
  }

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
      <div className="problem-submit-action">
        <ButtonLink to={`/problems/${encodeURIComponent(problem.id)}/submit`}>Отправить решение</ButtonLink>
      </div>

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
                  {sample.inputDownloadUrl && <button
                    type="button"
                    className="sample-download-button"
                    disabled={downloads[`${sample.id}:input`]?.busy}
                    onClick={() => void downloadSampleFile(sample.inputDownloadUrl!, `${sample.id}:input`, `${problem.slug}-sample-${sample.ordinal}-input.txt`, sample.id, 'input')}
                  >{downloads[`${sample.id}:input`]?.busy ? 'Скачиваем…' : 'Скачать входные данные'}</button>}
                  {sample.expectedDownloadUrl && <button
                    type="button"
                    className="sample-download-button"
                    disabled={downloads[`${sample.id}:expected`]?.busy}
                    onClick={() => void downloadSampleFile(sample.expectedDownloadUrl!, `${sample.id}:expected`, `${problem.slug}-sample-${sample.ordinal}-output.txt`, sample.id, 'expected')}
                  >{downloads[`${sample.id}:expected`]?.busy ? 'Скачиваем…' : 'Скачать ожидаемый вывод'}</button>}
                </div>
                {downloads[`${sample.id}:input`]?.error && <p className="sample-download-error" role="alert">Входные данные: {downloads[`${sample.id}:input`]?.error}</p>}
                {downloads[`${sample.id}:expected`]?.error && <p className="sample-download-error" role="alert">Ожидаемый вывод: {downloads[`${sample.id}:expected`]?.error}</p>}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
