import { Slot } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useRequireAuth } from '@/src/hooks/useRequireAuth'

export default function AuthenticatedLayout() {
  const { isLoaded, isSignedIn } = useRequireAuth()

  if (!isLoaded || !isSignedIn) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    )
  }

  return <Slot />
}
