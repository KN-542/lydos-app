import { useQuery } from '@tanstack/react-query'
import { client } from '../../lib/api'

export function usePlansQuery() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data, error } = await client.GET('/setting/plans')
      if (error) throw new Error('プランの取得に失敗しました')
      return data
    },
  })
}
