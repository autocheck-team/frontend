import type { ApiRequester } from './problems'

export interface Submission {
  id: string
  problemId: string
  languageId: string
  status: string
  verdict: string
  createTime?: string
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
