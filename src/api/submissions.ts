import type { ApiRequester } from './problems'

export interface Submission {
  id: string
  problemId: string
  userId?: string
  languageId: string
  sourceSizeBytes?: number
  status: string
  verdict: string
  score?: number
  maxTimeMs?: number
  maxMemoryKb?: number
  compileLog?: string
  createTime?: string
  startTime?: string
  finishTime?: string
}

export interface TestRun {
  testCaseId: string
  ordinal: number
  isSample: boolean
  verdict: string
  timeMs: number
  memoryKb: number
  cpuTimeMs: number
  stderrTail?: string
}

export interface SubmissionResult {
  submission: Submission
  testRuns: TestRun[]
}

export interface SubmissionPage {
  submissions: Submission[]
  nextPageToken?: string
}

export async function getSubmission(api: ApiRequester, id: string): Promise<SubmissionResult> {
  const response = await api.request<Partial<SubmissionResult>>(`/v1/submissions/${encodeURIComponent(id)}`)
  if (!response.submission) throw new Error('Сервер не вернул данные посылки.')
  return { submission: response.submission, testRuns: response.testRuns ?? [] }
}

export async function listSubmissions(
  api: ApiRequester,
  options: { problemId?: string; pageSize?: number; pageToken?: string } = {},
): Promise<SubmissionPage> {
  const query = new URLSearchParams({ pageSize: String(options.pageSize ?? 20) })
  if (options.problemId) query.set('problemId', options.problemId)
  if (options.pageToken) query.set('pageToken', options.pageToken)
  const response = await api.request<Partial<SubmissionPage>>(`/v1/submissions?${query.toString()}`)
  return { submissions: response.submissions ?? [], nextPageToken: response.nextPageToken }
}

export async function createSubmission(
  api: ApiRequester,
  problemId: string,
  body: { languageId: string; source: string; clientRequestId: string },
) {
  const response = await api.request<{ submission?: Submission }>(
    `/v1/problems/${encodeURIComponent(problemId)}/submissions`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  if (!response.submission?.id) throw new Error('Сервер не вернул идентификатор посылки.')
  return response.submission
}
