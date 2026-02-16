import { useQuery } from '@tanstack/react-query'
import { client } from '../../lib/api'

export function usePaymentMethodsQuery() {
  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const { data, error } = await client.GET('/setting/payment-methods')
      if (error) throw new Error('支払い方法の取得に失敗しました')
      return data
    },
  })
}
