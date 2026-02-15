import createClient, { type Middleware } from 'openapi-fetch'
import type { paths } from './api-types'

const apiUrl = process.env.EXPO_PUBLIC_API_URL as string

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
