import { useMemo } from 'react'
import { createApiClient } from './client'
import { useAuth } from '../auth/useAuth'

export function useApiClient() {
  const { getAccessToken } = useAuth()
  return useMemo(() => createApiClient(getAccessToken), [getAccessToken])
}
