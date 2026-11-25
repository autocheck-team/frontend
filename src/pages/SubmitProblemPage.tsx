import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { createSubmission, type Submission } from '../api/submissions'
import { getProblem, listLanguages, type Language, type Problem } from '../api/problems'
import { useApiClient } from '../api/useApiClient'
import { Button } from '../components/ui/Button'
import { Notice } from '../components/ui/Notice'
import { PageHeading } from '../components/ui/PageHeading'

const MonacoCodeEditor = lazy(async () => {
  const module = await import('../components/MonacoCodeEditor')
  return { default: module.MonacoCodeEditor }
})

interface EditorData {
  problem: Problem
  languages: Language[]
}

interface PendingRequest {
  id: string
  languageId: string
  source: string
}

function messageFor(error: unknown) {
  return error instanceof ApiError || error instanceof Error
    ? error.message
    : 'Не удалось отправить решение.'
}

function editorLanguage(languageId: string) {
  if (languageId.startsWith('go')) return 'go'
  if (languageId.startsWith('cpp')) return 'cpp'
  if (languageId.startsWith('python')) return 'python'
  if (languageId.startsWith('java')) return 'java'
  return 'plaintext'
}

function getAllowedLanguages(problem: Problem, languages: Language[]) {
  const byId = new Map(languages.map((language) => [language.id, language]))
  return problem.languageIds.flatMap((id) => {
    const language = byId.get(id)
    return language ? [language] : []
  })
}

export function SubmitProblemPage() {
  const { problemId = '' } = useParams()
  const api = useApiClient()
  const [data, setData] = useState<EditorData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [languageId, setLanguageId] = useState('')
  const [source, setSource] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const pendingRequest = useRef<PendingRequest | null>(null)

  useEffect(() => {
    let active = true
    void Promise.all([getProblem(api, problemId), listLanguages(api)])
      .then(([problem, languages]) => {
        if (!active) return
        setData({ problem, languages })
        const allowed = getAllowedLanguages(problem, languages)
        setLanguageId((current) => allowed.some((language) => language.id === current) ? current : (allowed[0]?.id ?? ''))
      })
      .catch((error: unknown) => {
        if (active) setLoadError(messageFor(error))
      })
    return () => { active = false }
  }, [api, problemId])

  const allowedLanguages = useMemo(
    () => data ? getAllowedLanguages(data.problem, data.languages) : [],
    [data],
  )
  const sourceBytes = useMemo(() => new TextEncoder().encode(source).byteLength, [source])
  const sourceTooLarge = sourceBytes > 65536

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    void file.text().then((contents) => {
      setSource(contents)
      setFileName(file.name)
      setSendError(null)
      setSubmission(null)
    }).catch(() => setSendError('Не удалось прочитать файл. Выберите текстовый исходный файл.'))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!data || !languageId || !source.length || sourceTooLarge) return
    setSending(true)
    setSendError(null)
    setSubmission(null)
    const previous = pendingRequest.current
    const request: PendingRequest = previous && previous.languageId === languageId && previous.source === source
      ? previous
      : { id: crypto.randomUUID(), languageId, source }
    pendingRequest.current = request
    try {
      const created = await createSubmission(api, data.problem.id, {
        languageId: request.languageId,
        source: request.source,
        clientRequestId: request.id,
      })
      pendingRequest.current = null
      setSubmission(created)
      setFileName(null)
    } catch (error) {
      setSendError(messageFor(error))
    } finally {
      setSending(false)
    }
  }

  if (!data && !loadError) {
    return <main className="page-shell submit-page"><Notice title="Загружаем редактор" role="status">Получаем задание и разрешённые языки…</Notice></main>
  }
  if (!data || loadError) {
    return (
      <main className="page-shell submit-page">
        <PageHeading eyebrow="Отправка решения" title="Не удалось открыть редактор" />
        <Notice title="Ошибка загрузки" tone="error" role="alert">{loadError ?? 'Данные задания недоступны.'}</Notice>
        <Link className="text-link" to={`/problems/${encodeURIComponent(problemId)}`}>Вернуться к заданию</Link>
      </main>
    )
  }

  return (
    <main className="page-shell submit-page">
      <Link className="back-link" to={`/problems/${encodeURIComponent(problemId)}`}>← К условию задания</Link>
      <PageHeading eyebrow={`Задание /${data.problem.slug}`} title="Отправить решение" />
      <p className="submit-problem-title">{data.problem.title}</p>

      {allowedLanguages.length === 0 ? (
        <Notice title="Нет доступного языка" tone="error" role="alert">
          Список языков из API не содержит ни одного языка, разрешённого для этого задания.
        </Notice>
      ) : (
        <form className="submit-form surface" onSubmit={(event) => void handleSubmit(event)}>
          <div className="submit-controls">
            <label className="form-field language-select-field">
              <span className="field-label">Язык программирования</span>
              <select className="text-input" value={languageId} onChange={(event) => {
                setLanguageId(event.target.value)
                setSubmission(null)
                setSendError(null)
              }} disabled={sending}>
                {allowedLanguages.map((language) => <option key={language.id} value={language.id}>{language.name}</option>)}
              </select>
            </label>
            <label className="upload-picker source-file-picker">
              <span>{fileName ? `Загружен: ${fileName}` : 'Загрузить файл с компьютера'}</span>
              <input type="file" accept=".go,.cpp,.cc,.cxx,.py,.java,.txt,text/plain" disabled={sending} onChange={handleFile} />
            </label>
          </div>

          <div className="editor-label-row">
            <span className="field-label">Исходный код</span>
            <span className={sourceTooLarge ? 'source-size source-size-error' : 'source-size'} aria-live="polite">
              {sourceBytes.toLocaleString('ru-RU')} / 65 536 байт
            </span>
          </div>
          <Suspense fallback={<Notice title="Загружаем Monaco Editor" role="status">Инициализируем редактор кода…</Notice>}>
            <MonacoCodeEditor
              value={source}
              language={editorLanguage(languageId)}
              onChange={(value) => { setSource(value); setFileName(null); setSubmission(null); setSendError(null) }}
            />
          </Suspense>
          <p className="field-hint">Максимальный размер исходного кода — 64 КБ в UTF-8. Файл можно изменить в редакторе до отправки.</p>

          {sourceTooLarge && <Notice title="Исходный код превышает ограничение" tone="error" role="alert">Уменьшите исходный код до 65 536 байт или меньше.</Notice>}
          {sendError && <Notice title="Не удалось отправить решение" tone="error" role="alert">{sendError}</Notice>}
          {submission && (
            <Notice title="Посылка создана" role="status">
              <p>Решение принято в очередь проверки. Идентификатор: <code>{submission.id}</code></p>
              <p>Статус: {submission.status.replace(/^SUBMISSION_STATUS_/, '').toLocaleLowerCase()}.</p>
              <Link className="text-link" to={`/submissions/${encodeURIComponent(submission.id)}`}>Открыть результат проверки →</Link>
            </Notice>
          )}

          <div className="submit-actions">
            <Button type="submit" disabled={sending || source.length === 0 || sourceTooLarge || !languageId}>
              {sending ? 'Отправляем…' : submission ? 'Отправить ещё раз' : 'Отправить на проверку'}
            </Button>
            <Link className="text-link" to={`/problems/${encodeURIComponent(problemId)}`}>Назад к заданию</Link>
          </div>
        </form>
      )}
    </main>
  )
}
