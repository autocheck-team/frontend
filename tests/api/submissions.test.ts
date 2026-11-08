import { describe, expect, it, vi } from 'vitest'
import { createSubmission, getSubmission, listSubmissions } from '../../src/api/submissions'
import type { ApiRequester } from '../../src/api/problems'

describe('submission API contract', () => {
  it('sends code and an idempotency key to the problem submission endpoint', async () => {
    const request = vi.fn(async () => ({ submission: { id: 'submission-id' } }))
    const api: ApiRequester = { request: request as ApiRequester['request'] }
    const payload = {
      languageId: 'go1.27',
      source: 'package main',
      clientRequestId: '7dd6848f-438e-4cee-adde-2926bdd9abbb',
    }

    await createSubmission(api, 'problem-id', payload)

    expect(request).toHaveBeenCalledWith('/v1/problems/problem-id/submissions', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  })

  it('requires the backend-created submission identifier', async () => {
    const api: ApiRequester = { request: vi.fn(async () => ({})) as ApiRequester['request'] }
    await expect(createSubmission(api, 'problem-id', {
      languageId: 'go1.27',
      source: 'package main',
      clientRequestId: '7dd6848f-438e-4cee-adde-2926bdd9abbb',
    })).rejects.toThrow('Сервер не вернул идентификатор посылки.')
  })

  it('loads the submission result and defaults missing test runs to an empty list', async () => {
    const submission = { id: 'submission-id', status: 'SUBMISSION_STATUS_RUNNING' }
    const request = vi.fn(async () => ({ submission }))
    const api: ApiRequester = { request: request as ApiRequester['request'] }

    await expect(getSubmission(api, 'sub/id')).resolves.toEqual({ submission, testRuns: [] })
    expect(request).toHaveBeenCalledWith('/v1/submissions/sub%2Fid')
  })

  it('uses only supported server pagination and problem filter parameters', async () => {
    const request = vi.fn(async () => ({ submissions: [], nextPageToken: 'next' }))
    const api: ApiRequester = { request: request as ApiRequester['request'] }

    await listSubmissions(api, { problemId: 'problem-id', pageSize: 10, pageToken: 'page/token' })
    expect(request).toHaveBeenCalledWith('/v1/submissions?pageSize=10&problemId=problem-id&pageToken=page%2Ftoken')
  })
})
