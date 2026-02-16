import createClient, { type Middleware } from 'openapi-fetch'
import { Platform } from 'react-native'
import type { paths } from './api-types'

// Android エミュレーターでは localhost が エミュレーター自身を指すため、
// 10.0.2.2（ホストマシンの localhost）に差し替える
const rawApiUrl = process.env.EXPO_PUBLIC_API_URL as string
const apiUrl = Platform.OS === 'android' ? rawApiUrl.replace('localhost', '10.0.2.2') : rawApiUrl

type TokenGetter = () => Promise<string | null>
let tokenGetter: TokenGetter | null = null

export function setTokenGetter(fn: TokenGetter) {
  tokenGetter = fn
}

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    if (tokenGetter) {
      const token = await tokenGetter()
      if (token) {
        request.headers.set('Authorization', `Bearer ${token}`)
      }
    }
    return request
  },
}

export const client = createClient<paths>({ baseUrl: apiUrl })
client.use(authMiddleware)
