import { useQuery } from '@tanstack/react-query'
import { client } from '../../lib/api'

export const sessionsQueryKey = ['chat-sessions'] as const

export function useSessionsQuery() {
  return useQuery({
    queryKey: sessionsQueryKey,
    queryFn: async () => {
      const response = await client.GET('/chat/sessions')
      if (response.error) throw new Error('セッションの取得に失敗しました')
      return response.data
    },
  })
}
