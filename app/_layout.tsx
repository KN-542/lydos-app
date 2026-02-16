import '../global.css'
import { ClerkLoaded, ClerkProvider } from '@clerk/clerk-expo'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { AuthProvider } from '@/src/components/AuthProvider'
import { tokenCache } from '@/src/lib/tokenCache'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000 * 60,
      refetchOnWindowFocus: false,
    },
  },
})

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY

if (!publishableKey) {
  throw new Error('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY が .env に設定されていません')
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </AuthProvider>
        </QueryClientProvider>
      </ClerkLoaded>
    </ClerkProvider>
  )
}
