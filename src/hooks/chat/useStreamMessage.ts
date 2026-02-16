import { useAuth } from '@clerk/clerk-expo'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { Platform } from 'react-native'
import { messagesQueryKey } from './useMessagesQuery'
import { sessionsQueryKey } from './useSessionsQuery'

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL as string
const apiUrl = Platform.OS === 'android' ? rawApiUrl.replace('localhost', '10.0.2.2') : rawApiUrl

function parseSseEvents(
  text: string,
  callbacks: {
    onToken: (token: string) => void
    onDone: () => void
    onError: (message: string) => void
  }
) {
  const parts = text.split('\n\n')

  for (const part of parts) {
    for (const line of part.split('\n')) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6)
      if (payload === '[DONE]') return

      let parsed: { token: string } | { messageId: number } | { error: string }
      try {
        parsed = JSON.parse(payload)
      } catch {
        continue
      }

      if ('error' in parsed) {
        callbacks.onError(parsed.error)
        return
      }
      if ('token' in parsed) {
        callbacks.onToken(parsed.token)
      }
      if ('messageId' in parsed) {
        callbacks.onDone()
      }
    }
  }
}

export function useStreamMessage() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  const streamMessage = useCallback(
    async (sessionId: string, content: string) => {
      setIsStreaming(true)
      setStreamingText('')

      try {
        const token = await getToken()

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('POST', `${apiUrl}/chat/sessions/${sessionId}/messages`)
          xhr.setRequestHeader('Content-Type', 'application/json')
          if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

          let processed = 0
          let buffer = ''

          const processNewData = (newData: string) => {
            buffer += newData
            const parts = buffer.split('\n\n')
            buffer = parts.pop() ?? ''

            for (const completePart of parts) {
              parseSseEvents(`${completePart}\n\n`, {
                onToken: (t) => setStreamingText((prev) => prev + t),
                onDone: () => {
                  queryClient.invalidateQueries({ queryKey: messagesQueryKey(sessionId) })
                  queryClient.invalidateQueries({ queryKey: sessionsQueryKey })
                },
                onError: (message) => reject(new Error(message)),
              })
            }
          }

          xhr.onprogress = () => {
            const newData = xhr.responseText.slice(processed)
            processed = xhr.responseText.length
            processNewData(newData)
          }

          xhr.onload = () => {
            const remaining = xhr.responseText.slice(processed)
            if (remaining) processNewData(remaining)
            resolve()
          }

          xhr.onerror = () => reject(new Error('メッセージの送信に失敗しました'))

          xhr.send(JSON.stringify({ content }))
        })
      } finally {
        setIsStreaming(false)
        setStreamingText('')
      }
    },
    [getToken, queryClient]
  )

  return { streamMessage, streamingText, isStreaming }
}
