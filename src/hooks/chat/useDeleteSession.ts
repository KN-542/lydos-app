import { useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '../../lib/api'
import { sessionsQueryKey } from './useSessionsQuery'

export function useDeleteSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await client.DELETE('/chat/sessions/{sessionId}', {
        params: { path: { sessionId } },
      })
      if (error) throw new Error('セッションの削除に失敗しました')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionsQueryKey })
    },
  })
}
