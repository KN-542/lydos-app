import { useAuth, useSignIn, useSSO } from '@clerk/clerk-expo'
import * as Linking from 'expo-linking'
import { Link, router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
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
  const handleSecondFactor = useCallback(
    async (
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
    },
    []
  )

  // FIXME: lydos-view の <SignIn /> ビルトインコンポーネントでブラウザ登録したアカウントが
  //   iOS アプリではログインできない。lydos-app で iOS 登録したアカウントはログイン可能。
  //   原因: lydos-view は Clerk ビルトイン UI のため内部フローが非公開。
  //         useSignIn フックの手動実装では create({ identifier, password }) の結果が
  //         complete にならないケースがある可能性（needs_first_factor 等）。
  //   試した対策: 2 ステップフロー (create → attemptFirstFactor) に変更 → ブラウザアカウントで不可
  //   要調査: Clerk ダッシュボードの Instance 設定（Username 必須 / Email verification 戦略等）と
  //           実際に返ってくる status / supportedFirstFactors の値。
  const handleSignIn = useCallback(async () => {
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
  }, [isLoaded, signIn, loading, email, password, setActive, handleSecondFactor])

  const handleMFAVerify = useCallback(async () => {
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
  }, [isLoaded, signIn, loading, mfaStrategy, mfaCode, setActive])

  const handleGoogleSignIn = useCallback(async () => {
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
  }, [googleLoading, startSSOFlow, handleSecondFactor])

  // MFA 画面
  if (pendingMFA) {
    const label = MFA_LABELS[mfaStrategy]
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.inner}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.form}>
            <Text style={styles.title}>Lydos</Text>
            <Text style={styles.subtitle}>{label.title}</Text>
            <Text style={styles.description}>{label.description}</Text>

            <TextInput
              style={styles.input}
              placeholder="確認コード"
              placeholderTextColor="#9CA3AF"
              value={mfaCode}
              onChangeText={setMfaCode}
              keyboardType={label.numeric ? 'numeric' : 'default'}
              autoComplete={mfaStrategy === 'totp' ? 'one-time-code' : 'off'}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.button, (!mfaCode || loading) && styles.buttonDisabled]}
              onPress={handleMFAVerify}
              disabled={!mfaCode || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>確認</Text>
              )}
            </TouchableOpacity>

            {hasBackupCode && mfaStrategy !== 'backup_code' && (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => {
                  setMfaStrategy('backup_code')
                  setMfaCode('')
                }}
              >
                <Text style={styles.linkText}>バックアップコードを使用する</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => {
                setPendingMFA(false)
                setMfaCode('')
              }}
            >
              <Text style={styles.linkText}>← ログイン画面に戻る</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  // ログイン画面
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Lydos</Text>
          <Text style={styles.subtitle}>ログイン</Text>

          <TextInput
            style={styles.input}
            placeholder="メールアドレス"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="パスワード"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, (!email || !password || loading) && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={!email || !password || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>ログイン</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>または</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#374151" />
            ) : (
              <>
                <GoogleIcon size={20} />
                <Text style={styles.googleButtonText}>Google でログイン</Text>
              </>
            )}
          </TouchableOpacity>

          <Link href="/sign-up" asChild>
            <TouchableOpacity style={styles.linkButton}>
              <Text style={styles.linkText}>アカウントをお持ちでない方はこちら</Text>
            </TouchableOpacity>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  inner: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  form: {
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#6B7280',
    fontSize: 14,
  },
})
