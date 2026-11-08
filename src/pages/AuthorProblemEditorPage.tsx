import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import {
  confirmChecker,
  confirmTestCase,
  createProblem,
  createTestCase,
  deleteTestCase,
  loadAllProblemSubmissions,
  requestCheckerUpload,
  updateProblem,
  uploadPresignedFile,
  type ProblemInput,
  type SubmissionSummary,
} from '../api/author'
import {
  getProblem,
  listLanguages,
  listProblemTestCases,
  type Language,
  type Problem,
  type TestCase,
} from '../api/problems'
import { useApiClient } from '../api/useApiClient'
import { Button, ButtonLink } from '../components/ui/Button'
import { Notice } from '../components/ui/Notice'
import { PageHeading } from '../components/ui/PageHeading'

const blankProblem: ProblemInput = {
  slug: '',
  title: '',
  statement: '',
  timeLimitMs: 1000,
  memoryLimitKb: 262144,
  checker: 'tokens',
  languageIds: [],
  allowAiHints: false,
  isPublished: false,
  stopOnFirstFailure: false,
}

interface TestUpload {
  id: string
  inputUrl: string
  expectedUrl: string
  inputFile: File
  expectedFile: File
  uploaded: boolean
  error?: string
}

interface LoadedData {
  problem?: Problem
  languages: Language[]
  testCases: TestCase[]
}

function errorMessage(error: unknown) {
  return error instanceof ApiError || error instanceof Error
    ? error.message
    : 'Не удалось выполнить запрос.'
}

function verdictLabel(verdict: string) {
  const key = verdict.replace(/^VERDICT_/, '')
  return ({ OK: 'принято', COMPILATION_ERROR: 'ошибка компиляции', WRONG_ANSWER: 'неверный ответ', TIME_LIMIT_EXCEEDED: 'лимит времени', MEMORY_LIMIT_EXCEEDED: 'лимит памяти', RUNTIME_ERROR: 'ошибка выполнения', SYSTEM_ERROR: 'сбой проверки', UNSPECIFIED: 'не завершена' } as Record<string, string>)[key] ?? key
}

function summarizeSubmissions(submissions: SubmissionSummary[]) {
  const inProgress = submissions.filter((submission) =>
    ['QUEUED', 'COMPILING', 'RUNNING'].some((status) => submission.status.endsWith(status)),
  ).length
  const verdicts = new Map<string, number>()
  for (const submission of submissions) {
    const key = submission.verdict.replace(/^VERDICT_/, '')
    if (key && key !== 'UNSPECIFIED') verdicts.set(key, (verdicts.get(key) ?? 0) + 1)
  }
  return { inProgress, verdicts: [...verdicts.entries()] }
}

export function AuthorProblemEditorPage() {
  const { problemId } = useParams()
  const navigate = useNavigate()
  const api = useApiClient()
  const isNew = !problemId
  const [draft, setDraft] = useState<ProblemInput>(blankProblem)
  const [loaded, setLoaded] = useState<LoadedData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [testUpload, setTestUpload] = useState<TestUpload | null>(null)
  const [testBusy, setTestBusy] = useState(false)
  const [checkerBusy, setCheckerBusy] = useState(false)
  const [checkerMessage, setCheckerMessage] = useState<string | null>(null)
  const [stats, setStats] = useState<SubmissionSummary[] | null>(null)
  const [statsBusy, setStatsBusy] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)

  async function reloadData(id: string) {
    const [problem, languages, testCases] = await Promise.all([
      getProblem(api, id),
      listLanguages(api),
      listProblemTestCases(api, id),
    ])
    setDraft({
      slug: problem.slug,
      title: problem.title,
      statement: problem.statement,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitKb: problem.memoryLimitKb,
      checker: (problem.checker.replace(/^CHECKER_/, '').toLocaleLowerCase() || 'tokens') as ProblemInput['checker'],
      ...(problem.floatEpsilon === undefined ? {} : { floatEpsilon: problem.floatEpsilon }),
      languageIds: problem.languageIds,
      allowAiHints: problem.allowAiHints ?? false,
      isPublished: problem.isPublished,
      stopOnFirstFailure: problem.stopOnFirstFailure ?? false,
    })
    setLoaded({ problem, languages, testCases })
  }

  useEffect(() => {
    let active = true
    setLoadError(null)
    const load = async () => {
      try {
        if (!problemId) {
          const languages = await listLanguages(api)
          if (active) setLoaded({ languages, testCases: [] })
        } else {
          const [problem, languages, testCases] = await Promise.all([
            getProblem(api, problemId),
            listLanguages(api),
            listProblemTestCases(api, problemId),
          ])
          if (!active) return
          setDraft({
            slug: problem.slug,
            title: problem.title,
            statement: problem.statement,
            timeLimitMs: problem.timeLimitMs,
            memoryLimitKb: problem.memoryLimitKb,
            checker: (problem.checker.replace(/^CHECKER_/, '').toLocaleLowerCase() || 'tokens') as ProblemInput['checker'],
            ...(problem.floatEpsilon === undefined ? {} : { floatEpsilon: problem.floatEpsilon }),
            languageIds: problem.languageIds,
            allowAiHints: problem.allowAiHints ?? false,
            isPublished: problem.isPublished,
            stopOnFirstFailure: problem.stopOnFirstFailure ?? false,
          })
          setLoaded({ problem, languages, testCases })
        }
      } catch (error) {
        if (active) setLoadError(errorMessage(error))
      }
    }
    void load()
    return () => { active = false }
  }, [api, problemId])

  function setField<K extends keyof ProblemInput>(field: K, value: ProblemInput[K]) {
    setDraft((current) => ({ ...current, [field]: value }))
    setSaveMessage(null)
    setFormError(null)
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!loaded) return
    setSaving(true)
    setFormError(null)
    setSaveMessage(null)
    try {
      const body: ProblemInput = {
        ...draft,
        ...(draft.checker === 'float' ? {} : { floatEpsilon: undefined }),
      }
      if (isNew) {
        const created = await createProblem(api, { ...body, isPublished: false })
        navigate(`/author/problems/${encodeURIComponent(created.id)}`, { replace: true })
      } else {
        const updated = await updateProblem(api, { ...loaded.problem!, ...body })
        setLoaded((current) => current ? { ...current, problem: updated } : current)
        setSaveMessage('Изменения сохранены.')
      }
    } catch (error) {
      setFormError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!problemId || !loaded) return
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const inputFile = form.get('inputFile')
    const expectedFile = form.get('expectedFile')
    if (!(inputFile instanceof File) || inputFile.size === 0 || !(expectedFile instanceof File) || expectedFile.size === 0) {
      setFormError('Выберите оба файла: входные данные и ожидаемый вывод.')
      return
    }
    setTestBusy(true)
    setFormError(null)
    try {
      const pointsValue = Number(form.get('points') || 1)
      const created = await createTestCase(api, problemId, {
        isSample: form.get('isSample') === 'on',
        points: pointsValue,
      })
      if (!created.testCase?.id || !created.inputUploadUrl || !created.expectedUploadUrl) {
        await reloadData(problemId)
        throw new Error('API не вернул идентификатор теста или ссылки для загрузки.')
      }
      await reloadData(problemId)
      setTestUpload({
        id: created.testCase.id,
        inputUrl: created.inputUploadUrl,
        expectedUrl: created.expectedUploadUrl,
        inputFile,
        expectedFile,
        uploaded: false,
      })
      formElement.reset()
    } catch (error) {
      setFormError(errorMessage(error))
    } finally {
      setTestBusy(false)
    }
  }

  async function uploadAndConfirmTest() {
    if (!problemId || !testUpload) return
    setTestBusy(true)
    setTestUpload((current) => current ? { ...current, error: undefined } : current)
    try {
      if (!testUpload.uploaded) {
        await uploadPresignedFile(testUpload.inputUrl, testUpload.inputFile)
        await uploadPresignedFile(testUpload.expectedUrl, testUpload.expectedFile)
        setTestUpload((current) => current ? { ...current, uploaded: true } : current)
      }
      await confirmTestCase(api, problemId, testUpload.id)
      await reloadData(problemId)
      setTestUpload(null)
    } catch (error) {
      setTestUpload((current) => current ? { ...current, error: errorMessage(error) } : current)
    } finally {
      setTestBusy(false)
    }
  }

  async function removeTest(testCaseId: string) {
    if (!problemId || testBusy) return
    setTestBusy(true)
    setFormError(null)
    try {
      await deleteTestCase(api, problemId, testCaseId)
      await reloadData(problemId)
    } catch (error) {
      setFormError(errorMessage(error))
    } finally {
      setTestBusy(false)
    }
  }

  async function uploadChecker(file: File) {
    if (!problemId) return
    setCheckerBusy(true)
    setCheckerMessage(null)
    try {
      const { uploadUrl } = await requestCheckerUpload(api, problemId)
      await uploadPresignedFile(uploadUrl, file)
      await confirmChecker(api, problemId)
      setCheckerMessage('Чекер загружен и подтверждён.')
    } catch (error) {
      setCheckerMessage(errorMessage(error))
    } finally {
      setCheckerBusy(false)
    }
  }

  async function loadStats() {
    if (!problemId) return
    setStatsBusy(true)
    setStatsError(null)
    try {
      setStats(await loadAllProblemSubmissions(api, problemId))
    } catch (error) {
      setStatsError(errorMessage(error))
    } finally {
      setStatsBusy(false)
    }
  }

  if (!loaded && !loadError) {
    return <main className="page-shell author-page"><Notice title="Загружаем редактор" role="status">Получаем данные задания и доступные языки…</Notice></main>
  }
  if (loadError || !loaded) {
    return (
      <main className="page-shell author-page">
        <PageHeading eyebrow="Кабинет автора" title="Не удалось открыть задание" />
        <Notice title="Ошибка загрузки" tone="error" role="alert">{loadError ?? 'Данные задания недоступны.'}</Notice>
        <Link className="text-link" to="/author/problems">Вернуться к списку</Link>
      </main>
    )
  }

  const readyCount = loaded.testCases.filter((testCase) => testCase.isReady).length
  const statsSummary = stats ? summarizeSubmissions(stats) : null

  return (
    <main className="page-shell author-page">
      <Link className="back-link" to="/author/problems">← Все мои задания</Link>
      <div className="author-heading-row">
        <PageHeading eyebrow={isNew ? 'Новое задание' : 'Кабинет автора'} title={isNew ? 'Создать задание' : (loaded.problem?.title ?? 'Редактирование задания')} />
        {!isNew && <ButtonLink to={`/problems/${encodeURIComponent(problemId!)}`}>Открыть страницу задания</ButtonLink>}
      </div>

      <form className="author-form surface" onSubmit={(event) => void handleSave(event)}>
        <div className="author-form-grid">
          <label className="form-field">
            <span className="field-label">Короткий адрес</span>
            <input className="text-input" required minLength={3} maxLength={64} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug} onChange={(event) => setField('slug', event.target.value)} />
            <span className="field-hint">Латинские строчные буквы, цифры и дефисы.</span>
          </label>
          <label className="form-field">
            <span className="field-label">Название</span>
            <input className="text-input" required maxLength={200} value={draft.title} onChange={(event) => setField('title', event.target.value)} />
          </label>
        </div>
        <label className="form-field">
          <span className="field-label">Условие (Markdown)</span>
          <textarea className="text-input author-statement" required maxLength={100000} value={draft.statement} onChange={(event) => setField('statement', event.target.value)} />
        </label>

        <div className="author-form-grid author-form-grid-three">
          <label className="form-field">
            <span className="field-label">Лимит времени на тест (мс)</span>
            <input className="text-input" type="number" required min={100} max={30000} step={1} value={draft.timeLimitMs} onChange={(event) => setField('timeLimitMs', Number(event.target.value))} />
            <span className="field-hint">От 100 до 30 000 мс.</span>
          </label>
          <label className="form-field">
            <span className="field-label">Лимит памяти (КБ)</span>
            <input className="text-input" type="number" required min={4096} max={2097152} step={1} value={draft.memoryLimitKb} onChange={(event) => setField('memoryLimitKb', Number(event.target.value))} />
            <span className="field-hint">От 4 МБ до 2 ГБ.</span>
          </label>
          <label className="form-field">
            <span className="field-label">Способ проверки</span>
            <select className="text-input" value={draft.checker} onChange={(event) => setField('checker', event.target.value as ProblemInput['checker'])}>
              <option value="exact">Точное совпадение</option>
              <option value="tokens">Сравнение токенов</option>
              <option value="float">Вещественные числа с погрешностью</option>
              <option value="custom">Собственный Python-чекер</option>
            </select>
          </label>
        </div>

        {draft.checker === 'float' && (
          <label className="form-field author-epsilon">
            <span className="field-label">Погрешность float</span>
            <input className="text-input" type="number" required min="0.000000000001" max="0.999999999999" step="any" value={draft.floatEpsilon ?? ''} onChange={(event) => setField('floatEpsilon', Number(event.target.value))} />
            <span className="field-hint">Значение должно быть больше 0 и меньше 1.</span>
          </label>
        )}

        <fieldset className="author-language-fieldset">
          <legend className="field-label">Разрешённые языки</legend>
          <div className="author-language-grid">
            {loaded.languages.map((language) => (
              <label className="author-check-option" key={language.id}>
                <input type="checkbox" checked={draft.languageIds.includes(language.id)} onChange={(event) => {
                  const next = event.target.checked
                    ? [...draft.languageIds, language.id]
                    : draft.languageIds.filter((id) => id !== language.id)
                  setField('languageIds', next)
                }} />
                <span>{language.name}</span>
              </label>
            ))}
          </div>
          {loaded.languages.length === 0 && <span className="field-hint">API не вернул доступные языки.</span>}
        </fieldset>

        <label className="author-check-option author-inline-option">
          <input type="checkbox" checked={draft.stopOnFirstFailure} onChange={(event) => setField('stopOnFirstFailure', event.target.checked)} />
          <span>Останавливать проверку после первого непройденного теста</span>
        </label>
        <label className="author-check-option author-inline-option">
          <input type="checkbox" checked={draft.allowAiHints} onChange={(event) => setField('allowAiHints', event.target.checked)} />
          <span>Разрешить ИИ-подсказки</span>
        </label>

        {!isNew && (
          <div className="author-publish-row">
            <label className="author-check-option">
              <input type="checkbox" checked={draft.isPublished} disabled={readyCount === 0 && !draft.isPublished} onChange={(event) => setField('isPublished', event.target.checked)} />
              <span>Опубликовать задание</span>
            </label>
            {readyCount === 0 && <span className="field-hint">Добавьте хотя бы один подтверждённый тест, чтобы опубликовать задание.</span>}
          </div>
        )}

        {formError && <Notice title="Не удалось сохранить" tone="error" role="alert">{formError}</Notice>}
        {saveMessage && <Notice title="Сохранено" role="status">{saveMessage}</Notice>}
        <div className="author-form-actions">
          <Button type="submit" disabled={saving || loaded.languages.length === 0 || draft.languageIds.length === 0}>
            {saving ? 'Сохраняем…' : isNew ? 'Создать черновик' : 'Сохранить изменения'}
          </Button>
          {!isNew && <span className="field-hint">Сервер проверит право изменения и готовность задания перед публикацией.</span>}
        </div>
      </form>

      {!isNew && problemId && (
        <>
          {draft.checker === 'custom' && (
            <section className="author-section surface">
              <div className="section-heading-row">
                <h2>Python-чекер</h2>
                <span className="checker-chip">custom</span>
              </div>
              <p className="muted-copy">Загрузите .py-файл и подтвердите его. Состояние чекера отдельно не возвращается API; backend проверит его при публикации.</p>
              <label className="upload-picker">
                <span>{checkerBusy ? 'Загружаем и подтверждаем…' : 'Выбрать файл чекера'}</span>
                <input type="file" accept=".py,text/x-python" disabled={checkerBusy} onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void uploadChecker(file)
                  event.currentTarget.value = ''
                }} />
              </label>
              {checkerMessage && <p className="field-hint" role="status">{checkerMessage}</p>}
            </section>
          )}

          <section className="author-section surface">
            <div className="section-heading-row">
              <h2>Тесты</h2>
              <span className="sample-count">{readyCount} готовы</span>
            </div>
            <p className="muted-copy">После создания теста файлы отправляются в хранилище по временным ссылкам. Тест участвует в проверке только после подтверждения.</p>
            <form className="test-upload-form" onSubmit={(event) => void handleCreateTest(event)}>
              <label className="form-field">
                <span className="field-label">Входные данные</span>
                <input className="text-input file-input" type="file" name="inputFile" required disabled={testBusy || Boolean(testUpload)} />
              </label>
              <label className="form-field">
                <span className="field-label">Ожидаемый вывод</span>
                <input className="text-input file-input" type="file" name="expectedFile" required disabled={testBusy || Boolean(testUpload)} />
              </label>
              <label className="form-field points-field">
                <span className="field-label">Баллы</span>
                <input className="text-input" type="number" name="points" min={0} max={1000} step={1} defaultValue={1} disabled={testBusy || Boolean(testUpload)} />
              </label>
              <label className="author-check-option sample-option">
                <input type="checkbox" name="isSample" disabled={testBusy || Boolean(testUpload)} />
                <span>Открытый пример</span>
              </label>
              <Button type="submit" disabled={testBusy || Boolean(testUpload)}>{testBusy ? 'Создаём…' : 'Создать и загрузить тест'}</Button>
            </form>

            {testUpload && (
              <div className="pending-upload" role="status">
                <div>
                  <strong>Тест создан, файлы готовы к загрузке</strong>
                  <p>{testUpload.inputFile.name} · {testUpload.expectedFile.name}</p>
                  {testUpload.error && <p className="form-error">{testUpload.error}</p>}
                  <span className="field-hint">Ссылки временные. Если загрузка не проходит из-за истечения срока, удалите неподтверждённый тест ниже и создайте его заново.</span>
                </div>
                <Button onClick={() => void uploadAndConfirmTest()} disabled={testBusy}>
                  {testBusy ? 'Загружаем…' : testUpload.uploaded ? 'Подтвердить тест' : 'Загрузить файлы и подтвердить'}
                </Button>
              </div>
            )}

            {loaded.testCases.length === 0 ? (
              <Notice title="Тестов пока нет" role="status">Загрузите пару файлов, чтобы добавить первый тест.</Notice>
            ) : (
              <div className="author-test-list">
                {loaded.testCases.map((testCase) => (
                  <article className="author-test-row" key={testCase.id}>
                    <div>
                      <strong>Тест {testCase.ordinal}</strong>
                      <span>{testCase.isSample ? 'Открытый пример' : 'Закрытый тест'} · {testCase.points} б. · {testCase.isReady ? 'готов' : 'не подтверждён'}</span>
                    </div>
                    <Button className="button-secondary" disabled={testBusy} onClick={() => void removeTest(testCase.id)}>Удалить</Button>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="author-section surface">
            <div className="section-heading-row">
              <h2>Посылки студентов</h2>
              <Button className="button-secondary" disabled={statsBusy} onClick={() => void loadStats()}>
                {statsBusy ? 'Загружаем все страницы…' : stats ? 'Обновить статистику' : 'Загрузить статистику'}
              </Button>
            </div>
            <p className="muted-copy">Статистика собирается из всех страниц списка посылок. Отдельного агрегатного API нет.</p>
            {statsError && <Notice title="Не удалось загрузить посылки" tone="error" role="alert">{statsError}</Notice>}
            {stats && statsSummary && (
              stats.length === 0 ? <Notice title="Посылок пока нет" role="status">Для этого задания ещё не отправляли решения.</Notice> :
                <div className="author-stats" aria-live="polite">
                  <div><strong>{stats.length}</strong><span>всего посылок</span></div>
                  <div><strong>{statsSummary.inProgress}</strong><span>в очереди или проверяются</span></div>
                  {statsSummary.verdicts.map(([verdict, count]) => (
                    <div key={verdict}><strong>{count}</strong><span>{verdictLabel(verdict)}</span></div>
                  ))}
                  <span className="field-hint">Данные обновлены запросом к API; статистика не обновляется автоматически.</span>
                </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}
