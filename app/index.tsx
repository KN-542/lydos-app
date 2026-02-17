import { useAuth, useSignIn, useSSO } from '@clerk/clerk-expo'
import * as Linking from 'expo-linking'
import { Link, router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GoogleIcon } from '@/src/components/GoogleIcon'

WebBrowser.maybeCompleteAuthSession()

type MFAStrategy = 'totp' | 'phone_code' | 'backup_code'

const MFA_LABELS: Record<MFAStrategy, { title: string; description: string; numeric: boolean }> = {
  totp: {
    title: '二段階認証',
    description: '認証アプリの 6 桁のコードを入力してください',
    numeric: true,
  },
  phone_code: {
    title: 'SMS 認証',
    description: 'SMS に送信された確認コードを入力してください',
    numeric: true,
  },
  backup_code: {
    title: 'バックアップコード',
    description: 'バックアップコードを入力してください',
    numeric: false,
  },
}

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn()
  const { isSignedIn } = useAuth()
  const { startSSOFlow } = useSSO()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // MFA
  const [pendingMFA, setPendingMFA] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaStrategy, setMfaStrategy] = useState<MFAStrategy>('totp')
  const [hasBackupCode, setHasBackupCode] = useState(false)

  useEffect(() => {
    if (isSignedIn) {
      router.replace('/(authenticated)/home')
    }
  }, [isSignedIn])

  // needs_second_factor を処理する共通関数
  // FIXME: MFA 未設定アカウントでも needs_second_factor + backup_code のみが返ることがある。
  //   その場合は下の !totp && !phone && !backup を通過せず backup_code 入力画面が表示される。
  //   lydos-view は <SignIn /> ビルトインコンポーネントを使っているため同現象が出ない。
  //   対策候補: `if (!totp && !phone)` に変更して backup_code のみなら MFA 画面を出さない。
  //   ただしその場合 backup_code のみのアカウントが完全にログイン不能になるトレードオフあり。
  const handleSecondFactor = async (
    factors: Array<{ strategy: string; phoneNumberId?: string }>,
    preparePhone: (id: string) => Promise<unknown>
  ) => {
    const totp = factors.find((f) => f.strategy === 'totp')
    const phone = factors.find((f) => f.strategy === 'phone_code')
    const backup = factors.find((f) => f.strategy === 'backup_code')

    if (!totp && !phone && !backup) {
      // 認識できる MFA 方式がない（MFA 未設定 + Force 2FA 等）
      Alert.alert(
        '二段階認証が必要です',
        'アカウントに二段階認証が設定されていません。Clerk ダッシュボードで認証アプリを設定してください。'
      )
      return
    }

    setHasBackupCode(!!backup)

    if (totp) {
      setMfaStrategy('totp')
    } else if (phone) {
      await preparePhone(phone.phoneNumberId ?? '')
      setMfaStrategy('phone_code')
    } else {
      setMfaStrategy('backup_code')
    }

    setPendingMFA(true)
  }

  // FIXME: lydos-view の <SignIn /> ビルトインコンポーネントでブラウザ登録したアカウントが
  //   iOS アプリではログインできない。lydos-app で iOS 登録したアカウントはログイン可能。
  //   原因: lydos-view は Clerk ビルトイン UI のため内部フローが非公開。
  //         useSignIn フックの手動実装では create({ identifier, password }) の結果が
  //         complete にならないケースがある可能性（needs_first_factor 等）。
  //   試した対策: 2 ステップフロー (create → attemptFirstFactor) に変更 → ブラウザアカウントで不可
  //   要調査: Clerk ダッシュボードの Instance 設定（Username 必須 / Email verification 戦略等）と
  //           実際に返ってくる status / supportedFirstFactors の値。
  const handleSignIn = async () => {
    if (!isLoaded || !signIn || loading) return
    setLoading(true)
    try {
      const result = await signIn.create({ identifier: email, password })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        router.replace('/(authenticated)/home')
        return
      }

      if (result.status === 'needs_second_factor') {
        await handleSecondFactor(result.supportedSecondFactors ?? [], (id) =>
          signIn.prepareSecondFactor({ strategy: 'phone_code', phoneNumberId: id })
        )
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '認証に失敗しました'
      Alert.alert('エラー', message)
    } finally {
      setLoading(false)
    }
  }

  const handleMFAVerify = async () => {
    if (!isLoaded || !signIn || loading) return
    setLoading(true)
    try {
      const result = await signIn.attemptSecondFactor({
        strategy: mfaStrategy,
        code: mfaCode,
      })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        router.replace('/(authenticated)/home')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'コードが正しくありません'
      Alert.alert('エラー', message)
      setMfaCode('')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (googleLoading) return
    setGoogleLoading(true)
    try {
      const {
        createdSessionId,
        setActive: setSSOActive,
        signIn: ssoSignIn,
      } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: Linking.createURL('/', { scheme: 'lydos' }),
      })

      // 通常ログイン完了
      if (createdSessionId && setSSOActive) {
        await setSSOActive({ session: createdSessionId })
        router.replace('/(authenticated)/home')
        return
      }

      // Clerk レベルの MFA が必要
      if (ssoSignIn?.status === 'needs_second_factor') {
        await handleSecondFactor(ssoSignIn.supportedSecondFactors ?? [], (id) =>
          ssoSignIn.prepareSecondFactor({ strategy: 'phone_code', phoneNumberId: id })
        )
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Googleログインに失敗しました'
      Alert.alert('エラー', message)
    } finally {
      setGoogleLoading(false)
    }
  }

  // MFA 画面
  if (pendingMFA) {
    const label = MFA_LABELS[mfaStrategy]
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View className="px-6">
            <Text className="text-[32px] font-bold text-gray-900 text-center mb-2">Lydos</Text>
            <Text className="text-xl text-gray-500 text-center mb-8">{label.title}</Text>
            <Text className="text-sm text-gray-500 text-center mb-6 leading-[22px]">
              {label.description}
            </Text>

            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-[14px] mb-4 text-base text-gray-900 bg-white"
              placeholder="確認コード"
              placeholderTextColor="#9CA3AF"
              value={mfaCode}
              onChangeText={setMfaCode}
              keyboardType={label.numeric ? 'numeric' : 'default'}
              autoComplete={mfaStrategy === 'totp' ? 'one-time-code' : 'off'}
              autoFocus
            />

            <TouchableOpacity
              className={`bg-gray-900 rounded-xl py-[14px] items-center mt-2${!mfaCode || loading ? ' opacity-50' : ''}`}
              onPress={handleMFAVerify}
              disabled={!mfaCode || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-base font-semibold">確認</Text>
              )}
            </TouchableOpacity>

            {hasBackupCode && mfaStrategy !== 'backup_code' && (
              <TouchableOpacity
                className="mt-5 items-center"
                onPress={() => {
                  setMfaStrategy('backup_code')
                  setMfaCode('')
                }}
              >
                <Text className="text-gray-500 text-sm">バックアップコードを使用する</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className="mt-5 items-center"
              onPress={() => {
                setPendingMFA(false)
                setMfaCode('')
              }}
            >
              <Text className="text-gray-500 text-sm">← ログイン画面に戻る</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  // ログイン画面
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingVertical: 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-[32px] font-bold text-gray-900 text-center mb-2">Lydos</Text>
          <Text className="text-xl text-gray-500 text-center mb-8">ログイン</Text>

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
            onPress={handleSignIn}
            disabled={!email || !password || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-semibold">ログイン</Text>
            )}
          </TouchableOpacity>

          <View className="flex-row items-center my-5 gap-3">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="text-[13px] text-gray-400">または</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          <TouchableOpacity
            className={`flex-row items-center justify-center gap-[10px] border border-gray-300 rounded-xl py-[14px] bg-white${googleLoading ? ' opacity-50' : ''}`}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#374151" />
            ) : (
              <>
                <GoogleIcon size={20} />
                <Text className="text-base font-medium text-gray-700">Google でログイン</Text>
              </>
            )}
          </TouchableOpacity>

          <Link href="/sign-up" asChild>
            <TouchableOpacity className="mt-5 items-center">
              <Text className="text-gray-500 text-sm">アカウントをお持ちでない方はこちら</Text>
            </TouchableOpacity>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
