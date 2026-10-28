import type { ApiRequestOptions } from './client'

export interface ApiRequester {
  request<T>(path: string, options?: Omit<ApiRequestOptions, 'accessToken'>): Promise<T>
}

export interface Problem {
  id: string
  authorId: string
  slug: string
  title: string
  statement: string
  timeLimitMs: number
  memoryLimitKb: number
  checker: string
  languageIds: string[]
  isPublished: boolean
  readyTestCount: number
}

export interface ProblemPage {
  problems?: Problem[]
  nextPageToken?: string
}

export interface TestCase {
  id: string
  problemId: string
  ordinal: number
  isSample: boolean
  points: number
  isReady: boolean
  inputSizeBytes?: string
  expectedSizeBytes?: string
  inputDownloadUrl?: string
  expectedDownloadUrl?: string
}

export interface Language {
  id: string
  name: string
}

export function listProblems(
  api: ApiRequester,
  options: { pageToken?: string; onlyMine?: boolean; pageSize?: number } = {},
) {
  const query = new URLSearchParams()
  query.set('pageSize', String(options.pageSize ?? 20))
  if (options.pageToken) query.set('pageToken', options.pageToken)
  if (options.onlyMine) query.set('onlyMine', 'true')
  return api.request<ProblemPage>(`/v1/problems?${query.toString()}`)
}

export async function getProblem(api: ApiRequester, id: string) {
  const response = await api.request<{ problem?: Problem }>(`/v1/problems/${encodeURIComponent(id)}`)
  if (!response.problem) throw new Error('Сервер не вернул данные задания.')
  return response.problem
}

export async function listProblemTestCases(api: ApiRequester, id: string) {
  const response = await api.request<{ testCases?: TestCase[] }>(
    `/v1/problems/${encodeURIComponent(id)}/test-cases`,
  )
  return response.testCases ?? []
}

export async function listLanguages(api: ApiRequester) {
  const response = await api.request<{ languages?: Language[] }>('/v1/languages')
  return response.languages ?? []
}
