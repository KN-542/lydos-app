import { useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '../../lib/api'
import { sessionsQueryKey } from './useSessionsQuery'

export function useCreateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { modelId: number; title?: string }) => {
      const response = await client.POST('/chat/sessions', {
        body: { modelId: params.modelId, title: params.title },
      })
      if (response.error) throw new Error('セッションの作成に失敗しました')
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionsQueryKey })
    },
  })
}
