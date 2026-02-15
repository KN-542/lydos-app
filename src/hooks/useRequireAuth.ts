import { useAuth } from '@clerk/clerk-expo'
import { router } from 'expo-router'
import { useEffect } from 'react'

export function useRequireAuth() {
  const { isSignedIn, isLoaded } = useAuth()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/')
    }
  }, [isLoaded, isSignedIn])

  return { isSignedIn, isLoaded }
}
