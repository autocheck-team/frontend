import { describe, expect, it, vi } from 'vitest'
import { listProblems, type ApiRequester } from '../../src/api/problems'

describe('problem API contracts', () => {
  it('uses only the supported pagination and author filter query fields', async () => {
    const request = vi.fn(async (path: string) => {
      expect(path).toContain('/v1/problems?')
      return { problems: [] }
    })
    const api: ApiRequester = {
      request: <T>(path: string) => request(path) as Promise<T>,
    }

    await listProblems(api, { pageSize: 20, pageToken: 'next+page', onlyMine: true })

    expect(request).toHaveBeenCalledWith('/v1/problems?pageSize=20&pageToken=next%2Bpage&onlyMine=true')
  })

  it('omits the author filter when it is not requested', async () => {
    const request = vi.fn(async (path: string) => {
      expect(path).toContain('/v1/problems?')
      return { problems: [] }
    })
    const api: ApiRequester = {
      request: <T>(path: string) => request(path) as Promise<T>,
    }

    await listProblems(api, { pageSize: 20 })

    expect(request).toHaveBeenCalledWith('/v1/problems?pageSize=20')
  })
})
