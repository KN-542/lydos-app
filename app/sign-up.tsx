import { useSignUp, useSSO } from '@clerk/clerk-expo'
import * as Linking from 'expo-linking'
import { Link, router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GoogleIcon } from '@/src/components/GoogleIcon'

WebBrowser.maybeCompleteAuthSession()

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp()
  const { startSSOFlow } = useSSO()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [pendingVerification, setPendingVerification] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleSignUp = useCallback(async () => {
    if (!isLoaded || loading) return
    setLoading(true)
    try {
      await signUp.create({ firstName, lastName, emailAddress: email, password })
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setPendingVerification(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '登録に失敗しました'
      Alert.alert('エラー', message)
    } finally {
      setLoading(false)
    }
  }, [isLoaded, loading, signUp, firstName, lastName, email, password])

  const handleVerify = useCallback(async () => {
    if (!isLoaded || loading) return
    setLoading(true)
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code })
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId })
        router.replace('/(authenticated)/home')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '認証コードが正しくありません'
      Alert.alert('エラー', message)
    } finally {
      setLoading(false)
    }
  }, [isLoaded, loading, signUp, code, setActive])

  const handleGoogleSignUp = useCallback(async () => {
    if (googleLoading) return
    setGoogleLoading(true)
    try {
      const { createdSessionId, setActive: setSSOActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: Linking.createURL('/', { scheme: 'lydos' }),
      })
      if (createdSessionId && setSSOActive) {
        await setSSOActive({ session: createdSessionId })
        router.replace('/(authenticated)/home')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Googleログインに失敗しました'
      Alert.alert('エラー', message)
    } finally {
      setGoogleLoading(false)
    }
  }, [googleLoading, startSSOFlow])

  if (pendingVerification) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View className="px-6">
            <Text className="text-[32px] font-bold text-gray-900 text-center mb-2">Lydos</Text>
            <Text className="text-xl text-gray-500 text-center mb-8">メール確認</Text>
            <Text className="text-sm text-gray-500 text-center mb-6 leading-[22px]">
              {email} に送信された確認コードを入力してください
            </Text>

            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-[14px] mb-4 text-base text-gray-900 bg-white"
              placeholder="確認コード"
              placeholderTextColor="#9CA3AF"
              value={code}
              onChangeText={setCode}
              keyboardType="numeric"
              autoComplete="one-time-code"
            />

            <TouchableOpacity
              className={`bg-gray-900 rounded-xl py-[14px] items-center mt-2${!code || loading ? ' opacity-50' : ''}`}
              onPress={handleVerify}
              disabled={!code || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-base font-semibold">確認</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        className="flex-1 justify-center"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="px-6">
          <Text className="text-[32px] font-bold text-gray-900 text-center mb-2">Lydos</Text>
          <Text className="text-xl text-gray-500 text-center mb-8">新規登録</Text>

          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 border border-gray-300 rounded-xl px-4 py-[14px] mb-4 text-base text-gray-900 bg-white"
              placeholder="姓"
              placeholderTextColor="#9CA3AF"
              value={lastName}
              onChangeText={setLastName}
              autoComplete="family-name"
            />
            <TextInput
              className="flex-1 border border-gray-300 rounded-xl px-4 py-[14px] mb-4 text-base text-gray-900 bg-white"
              placeholder="名"
              placeholderTextColor="#9CA3AF"
              value={firstName}
              onChangeText={setFirstName}
              autoComplete="given-name"
            />
          </View>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-[14px] mb-4 text-base text-gray-900 bg-white"
            placeholder="メールアドレス"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-[14px] mb-4 text-base text-gray-900 bg-white"
            placeholder="パスワード"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            className={`bg-gray-900 rounded-xl py-[14px] items-center mt-2${!email || !password || loading ? ' opacity-50' : ''}`}
            onPress={handleSignUp}
            disabled={!email || !password || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-semibold">登録</Text>
            )}
          </TouchableOpacity>

          <View className="flex-row items-center my-5 gap-3">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="text-[13px] text-gray-400">または</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          <TouchableOpacity
            className={`flex-row items-center justify-center gap-[10px] border border-gray-300 rounded-xl py-[14px] bg-white${googleLoading ? ' opacity-50' : ''}`}
            onPress={handleGoogleSignUp}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#374151" />
            ) : (
              <>
                <GoogleIcon size={20} />
                <Text className="text-base font-medium text-gray-700">Google で登録</Text>
              </>
            )}
          </TouchableOpacity>

          <Link href="/" asChild>
            <TouchableOpacity className="mt-5 items-center">
              <Text className="text-gray-500 text-sm">すでにアカウントをお持ちの方はこちら</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
