import { useMutation } from '@tanstack/react-query'
import { client } from '../../lib/api'

type Params = {
  successUrl: string
  cancelUrl: string
}

export const useCreateCheckoutSession = () => {
  return useMutation({
    mutationFn: async (params: Params) => {
      const { data, error } = await client.POST('/setting/checkout-session', {
        body: { successUrl: params.successUrl, cancelUrl: params.cancelUrl },
      })
      if (error || !data) throw new Error('Checkout Sessionの作成に失敗しました')
      return data
    },
  })
}
