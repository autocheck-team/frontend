import type { ApiRequester } from './problems'
import type { Problem, ProblemPage, TestCase } from './problems'

export interface ProblemInput {
  slug: string
  title: string
  statement: string
  timeLimitMs: number
  memoryLimitKb: number
  checker: 'exact' | 'tokens' | 'float' | 'custom'
  floatEpsilon?: number
  languageIds: string[]
  allowAiHints: boolean
  isPublished: boolean
  stopOnFirstFailure: boolean
}

export interface SubmissionSummary {
  id: string
  problemId: string
  userId: string
  languageId: string
  status: string
  verdict: string
  score?: number
  createTime?: string
}

export interface SubmissionPage {
  submissions?: SubmissionSummary[]
  nextPageToken?: string
}

function jsonBody(body: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(body) }
}

function checkerValue(checker: ProblemInput['checker']) {
  return `CHECKER_${checker.toLocaleUpperCase()}`
}

function problemBody(problem: ProblemInput) {
  return { ...problem, checker: checkerValue(problem.checker) }
}

export async function listAuthorProblems(api: ApiRequester, pageToken?: string): Promise<ProblemPage> {
  const query = new URLSearchParams({ pageSize: '100', onlyMine: 'true' })
  if (pageToken) query.set('pageToken', pageToken)
  return api.request<ProblemPage>(`/v1/problems?${query.toString()}`)
}

export async function createProblem(api: ApiRequester, problem: ProblemInput): Promise<Problem> {
  const response = await api.request<{ problem?: Problem }>('/v1/problems', {
    ...jsonBody(problemBody(problem)),
  })
  if (!response.problem) throw new Error('Сервер не вернул созданное задание.')
  return response.problem
}

export async function updateProblem(api: ApiRequester, problem: Problem & ProblemInput): Promise<Problem> {
  const { id, ...editableFields } = problem
  const response = await api.request<{ problem?: Problem }>(
    `/v1/problems/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(problemBody(editableFields)) },
  )
  if (!response.problem) throw new Error('Сервер не вернул обновлённое задание.')
  return response.problem
}

export async function createTestCase(
  api: ApiRequester,
  problemId: string,
  options: { isSample: boolean; points: number },
) {
  return api.request<{
    testCase?: TestCase
    inputUploadUrl: string
    expectedUploadUrl: string
    uploadExpireTime?: string
  }>(`/v1/problems/${encodeURIComponent(problemId)}/test-cases`, {
    ...jsonBody(options),
  })
}

export async function uploadPresignedFile(url: string, file: File) {
  let response: Response
  try {
    response = await fetch(url, { method: 'PUT', body: file })
  } catch {
    throw new Error('Не удалось загрузить файл в хранилище. Проверьте подключение и настройки CORS.')
  }
  if (!response.ok) {
    throw new Error(`Хранилище отклонило загрузку файла (HTTP ${response.status}).`)
  }
}

export async function confirmTestCase(api: ApiRequester, problemId: string, testCaseId: string) {
  return api.request<{ testCase?: TestCase }>(
    `/v1/problems/${encodeURIComponent(problemId)}/test-cases/${encodeURIComponent(testCaseId)}:confirm`,
    jsonBody({}),
  )
}

export async function deleteTestCase(api: ApiRequester, problemId: string, testCaseId: string) {
  return api.request<void>(
    `/v1/problems/${encodeURIComponent(problemId)}/test-cases/${encodeURIComponent(testCaseId)}`,
    { method: 'DELETE' },
  )
}

export async function requestCheckerUpload(api: ApiRequester, problemId: string) {
  return api.request<{ uploadUrl: string; uploadExpireTime?: string }>(
    `/v1/problems/${encodeURIComponent(problemId)}/checker:upload`,
    jsonBody({}),
  )
}

export async function confirmChecker(api: ApiRequester, problemId: string) {
  return api.request<void>(
    `/v1/problems/${encodeURIComponent(problemId)}/checker:confirm`,
    jsonBody({}),
  )
}

export async function listProblemSubmissions(
  api: ApiRequester,
  problemId: string,
  pageToken?: string,
): Promise<SubmissionPage> {
  const query = new URLSearchParams({ problemId, pageSize: '100' })
  if (pageToken) query.set('pageToken', pageToken)
  return api.request<SubmissionPage>(`/v1/submissions?${query.toString()}`)
}

export async function loadAllProblemSubmissions(api: ApiRequester, problemId: string) {
  const submissions: SubmissionSummary[] = []
  let pageToken: string | undefined
  do {
    const page = await listProblemSubmissions(api, problemId, pageToken)
    submissions.push(...(page.submissions ?? []))
    pageToken = page.nextPageToken || undefined
  } while (pageToken)
  return submissions
}
