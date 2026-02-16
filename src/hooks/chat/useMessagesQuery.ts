import { useQuery } from '@tanstack/react-query'
import { client } from '../../lib/api'

export const messagesQueryKey = (sessionId: string) => ['chat-messages', sessionId] as const

export function useMessagesQuery(sessionId: string | null) {
  return useQuery({
    queryKey: messagesQueryKey(sessionId ?? ''),
    enabled: sessionId !== null,
    queryFn: async () => {
      const id = sessionId as string
      const response = await client.GET('/chat/sessions/{sessionId}/messages', {
        params: { path: { sessionId: id } },
      })
      if (response.error) throw new Error('メッセージの取得に失敗しました')
      return response.data
    },
  })
}
