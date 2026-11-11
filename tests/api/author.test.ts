import { describe, expect, it, vi } from 'vitest'
import {
  createProblem,
  listAuthorProblems,
  listProblemSubmissions,
  updateProblem,
  type ProblemInput,
} from '../../src/api/author'
import type { ApiRequester, Problem } from '../../src/api/problems'

const input: ProblemInput = {
  slug: 'sample-task',
  title: 'Sample task',
  statement: 'Calculate the sum.',
  timeLimitMs: 1000,
  memoryLimitKb: 262144,
  checker: 'float',
  floatEpsilon: 0.001,
  languageIds: ['go1.27'],
  allowAiHints: false,
  isPublished: false,
  stopOnFirstFailure: false,
}

function apiWith(response: unknown) {
  const calls: Array<[string, RequestInit?]> = []
  const request = vi.fn(async (path: string, options?: RequestInit) => {
    calls.push([path, options])
    return response
  })
  const api: ApiRequester = { request: request as ApiRequester['request'] }
  return { api, request, calls }
}

describe('author API contracts', () => {
  it('lists only the current author problems with backend pagination', async () => {
    const { api, request } = apiWith({ problems: [], nextPageToken: 'next' })
    await listAuthorProblems(api, 'page/token')
    expect(request).toHaveBeenCalledWith('/v1/problems?pageSize=100&onlyMine=true&pageToken=page%2Ftoken')
  })

  it('sends the actual checker enum when creating a problem', async () => {
    const created = { id: 'problem-id' } as Problem
    const { api, request } = apiWith({ problem: created })
    await createProblem(api, input)
    expect(request).toHaveBeenCalledWith('/v1/problems', {
      method: 'POST',
      body: JSON.stringify({ ...input, checker: 'CHECKER_FLOAT' }),
    })
  })

  it('uses the PATCH path and excludes server-owned fields from the update body', async () => {
    const result = {
      ...input,
      id: 'problem-id',
      authorId: 'author-id',
      readyTestCount: 3,
      createTime: '2026-01-01T00:00:00Z',
    } as Problem & ProblemInput
    const { api, calls } = apiWith({ problem: result })
    await updateProblem(api, result)
    const [path, options] = calls[0]
    expect(path).toBe('/v1/problems/problem-id')
    expect(options?.method).toBe('PATCH')
    const body = JSON.parse(String(options?.body)) as Record<string, unknown>
    expect(body.id).toBeUndefined()
    expect(body.authorId).toBeUndefined()
    expect(body.readyTestCount).toBeUndefined()
    expect(body.createTime).toBeUndefined()
    expect(body.checker).toBe('CHECKER_FLOAT')
    expect(body).toEqual({
      slug: input.slug,
      title: input.title,
      statement: input.statement,
      timeLimitMs: input.timeLimitMs,
      memoryLimitKb: input.memoryLimitKb,
      checker: 'CHECKER_FLOAT',
      floatEpsilon: input.floatEpsilon,
      languageIds: input.languageIds,
      allowAiHints: input.allowAiHints,
      isPublished: input.isPublished,
      stopOnFirstFailure: input.stopOnFirstFailure,
    })
  })

  it('uses the supported problemId and pageToken submission filters', async () => {
    const { api, request } = apiWith({ submissions: [] })
    await listProblemSubmissions(api, 'problem-id', 'next page')
    expect(request).toHaveBeenCalledWith('/v1/submissions?problemId=problem-id&pageSize=100&pageToken=next+page')
  })
})
