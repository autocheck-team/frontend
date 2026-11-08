import { describe, expect, it, vi } from 'vitest'
import { createSubmission } from '../../src/api/submissions'
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
})
