import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert } from 'react-native'
import { client } from '../../lib/api'

export function useChangePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { planId: number; paymentMethodId: string }) => {
      const { error } = await client.POST('/setting/plan', {
        body: { planId: params.planId, paymentMethodId: params.paymentMethodId },
      })
      if (error) throw new Error('プランの変更に失敗しました')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      queryClient.invalidateQueries({ queryKey: ['chat-models'] })
      Alert.alert('完了', 'プランを変更しました')
    },
    onError: () => {
      Alert.alert('エラー', 'プランの変更に失敗しました')
    },
  })
}
