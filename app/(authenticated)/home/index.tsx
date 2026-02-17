import { useClerk, useUser } from '@clerk/clerk-expo'
import { router } from 'expo-router'
import { ChevronDown, Menu, Plus, Send, Settings, Trash2, X } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MarkdownContent } from '@/src/components/MarkdownContent'
import { useCreateSession } from '@/src/hooks/chat/useCreateSession'
import { useDeleteSession } from '@/src/hooks/chat/useDeleteSession'
import { useMessagesQuery } from '@/src/hooks/chat/useMessagesQuery'
import { useModelsQuery } from '@/src/hooks/chat/useModelsQuery'
import { useSessionsQuery } from '@/src/hooks/chat/useSessionsQuery'
import { useStreamMessage } from '@/src/hooks/chat/useStreamMessage'

const DRAWER_WIDTH = 280

export default function ChatScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useUser()
  const { signOut } = useClerk()

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [streamError, setStreamError] = useState<string | null>(null)
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isDrawerSettingsOpen, setIsDrawerSettingsOpen] = useState(false)

  const scrollViewRef = useRef<ScrollView>(null)
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current

  const { data: modelsData, isLoading: modelsLoading } = useModelsQuery()
  const { data: sessionsData, isLoading: sessionsLoading } = useSessionsQuery()
  const { data: messagesData } = useMessagesQuery(currentSessionId)
  const { mutateAsync: createSession } = useCreateSession()
  const { mutate: deleteSession } = useDeleteSession()
  const { streamMessage, streamingText, isStreaming } = useStreamMessage()

  const models = modelsData?.models ?? []
  const defaultModel = models.find((m) => m.isDefault) ?? models[0]
  const sessions = sessionsData?.sessions ?? []
  const messages = messagesData?.messages ?? []

  const [selectedModelId, setSelectedModelId] = useState<number | null>(null)
  const effectiveModelId = selectedModelId ?? defaultModel?.id ?? 0
  const selectedModel = models.find((m) => m.id === effectiveModelId) ?? defaultModel

  // pendingUserMessage が実メッセージに反映済みなら表示しない (重複防止)
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null
  const showPendingMessage =
    pendingUserMessage !== null &&
    !(lastMessage?.role === 'user' && lastMessage?.content === pendingUserMessage)

  // defaultModel が取得できたら初期値セット
  useEffect(() => {
    if (defaultModel && selectedModelId === null) {
      setSelectedModelId(defaultModel.id)
    }
  }, [defaultModel, selectedModelId])

  // メッセージ追加・ストリーミング時にスクロール
  // ref 操作に state を依存配列へ入れるのは本来不要だが、
  // 変化のたびにスクロールをトリガーする手段として意図的に指定している
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll trigger
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true })
  }, [messages.length, streamingText, pendingUserMessage])

  // ストリーミング完了後にオプティミスティック表示をクリア
  useEffect(() => {
    if (!isStreaming) setPendingUserMessage(null)
  }, [isStreaming])

  // ドロワーアニメーション
  const toggleDrawer = (open: boolean) => {
    setIsDrawerOpen(open)
    Animated.timing(drawerAnim, {
      toValue: open ? 0 : -DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start()
  }

  const handleSendMessage = async () => {
    if (prompt.trim() === '' || isStreaming || !selectedModel) return

    const content = prompt
    setPrompt('')
    setStreamError(null)
    setPendingUserMessage(content)

    let sessionId = currentSessionId

    if (sessionId === null) {
      const title = content.length > 20 ? `${content.slice(0, 20)}...` : content
      const session = await createSession({ modelId: effectiveModelId, title })
      sessionId = session.id
      setCurrentSessionId(session.id)
    }

    try {
      await streamMessage(sessionId, content)
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'メッセージの送信に失敗しました')
    }
  }

  const handleSelectSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId)
    setCurrentSessionId(sessionId)
    if (session) setSelectedModelId(session.modelId)
    setStreamError(null)
    toggleDrawer(false)
  }

  const handleDeleteSession = (sessionId: string) => {
    Alert.alert('確認', 'このチャットを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          deleteSession(sessionId, {
            onSuccess: () => {
              if (currentSessionId === sessionId) {
                setCurrentSessionId(null)
              }
            },
          })
        },
      },
    ])
  }

  const handleNewChat = () => {
    setCurrentSessionId(null)
    setStreamError(null)
    if (defaultModel) setSelectedModelId(defaultModel.id)
    toggleDrawer(false)
  }

  const handleSignOut = async () => {
    setIsProfileOpen(false)
    await signOut()
    router.replace('/')
  }

  if (modelsLoading || sessionsLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#111827" />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* ヘッダー */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
        <Pressable onPress={() => toggleDrawer(true)} className="p-2 rounded-lg">
          <Menu size={22} color="#374151" />
        </Pressable>
        <Text className="text-base font-semibold text-gray-800 flex-1 mx-3" numberOfLines={1}>
          {currentSessionId
            ? (sessions.find((s) => s.id === currentSessionId)?.title ?? 'チャット')
            : '新しいチャット'}
        </Text>
        <View className="flex-row items-center gap-1">
          <Pressable onPress={handleNewChat} className="p-2 rounded-lg">
            <Plus size={22} color="#374151" />
          </Pressable>
          <Pressable onPress={() => setIsProfileOpen(true)} className="p-1">
            {user?.imageUrl ? (
              <Image source={{ uri: user.imageUrl }} className="w-8 h-8 rounded-2xl" />
            ) : (
              <View className="w-8 h-8 rounded-2xl bg-gray-700 items-center justify-center">
                <Text className="text-white text-sm font-semibold">
                  {(user?.firstName ??
                    user?.primaryEmailAddress?.emailAddress ??
                    '?')[0].toUpperCase()}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* メインコンテンツ */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* メッセージエリア */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4 py-4"
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message) => (
            <View
              key={message.id}
              className={`mb-4 flex-row ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <View
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user' ? 'bg-gray-700' : 'bg-gray-50'
                }`}
              >
                <MarkdownContent content={message.content} dark={message.role === 'user'} />
              </View>
            </View>
          ))}

          {/* オプティミスティック: 送信直後のユーザーメッセージ */}
          {showPendingMessage && (
            <View className="mb-4 flex-row justify-end">
              <View className="max-w-[85%] rounded-2xl px-4 py-3 bg-gray-700">
                <MarkdownContent content={pendingUserMessage} dark />
              </View>
            </View>
          )}

          {/* ローディング (初回トークン待ち) */}
          {isStreaming && streamingText === '' && (
            <View className="mb-4 flex-row justify-start">
              <View className="rounded-2xl px-4 py-3 bg-gray-50">
                <Text className="text-sm text-gray-400">生成中...</Text>
              </View>
            </View>
          )}

          {/* ストリーミング中のアシスタントメッセージ */}
          {isStreaming && streamingText !== '' && (
            <View className="mb-4 flex-row justify-start">
              <View className="max-w-[85%] rounded-2xl px-4 py-3 bg-gray-50">
                <MarkdownContent content={streamingText} />
              </View>
            </View>
          )}

          {/* エラーメッセージ */}
          {streamError && (
            <View className="mb-4 flex-row justify-start">
              <View className="max-w-[85%] rounded-2xl px-4 py-3 bg-red-50 border border-red-200">
                <Text className="text-sm text-red-700">{streamError}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* 入力エリア */}
        <View
          className="border-t border-gray-200 bg-white px-4 py-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <View className="rounded-2xl border border-gray-300 bg-white">
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              placeholder="メッセージを入力..."
              placeholderTextColor="#9ca3af"
              editable={!isStreaming}
              multiline
              className="px-4 pt-3 pb-2 text-sm text-gray-900"
              style={{ maxHeight: 120 }}
            />

            {/* 下部バー: モデル選択 + 送信ボタン */}
            <View className="flex-row items-center justify-between px-3 pb-3">
              {/* モデル選択チップ */}
              {selectedModel && (
                <Pressable
                  onPress={() => setIsModelPickerOpen(!isModelPickerOpen)}
                  className="flex-row items-center rounded-lg px-2.5 py-1.5 border"
                  style={{
                    backgroundColor: `${selectedModel.color}18`,
                    borderColor: `${selectedModel.color}60`,
                  }}
                >
                  <Text className="text-xs font-medium mr-1" style={{ color: selectedModel.color }}>
                    {selectedModel.name}
                  </Text>
                  <ChevronDown size={12} color={selectedModel.color} />
                </Pressable>
              )}

              {/* 送信ボタン */}
              <Pressable
                onPress={handleSendMessage}
                disabled={prompt.trim() === '' || isStreaming}
                className="rounded-xl p-2"
                style={{
                  backgroundColor: selectedModel?.color ?? '#374151',
                  opacity: prompt.trim() === '' || isStreaming ? 0.4 : 1,
                }}
              >
                <Send size={16} color="#ffffff" />
              </Pressable>
            </View>
          </View>

          {/* モデルピッカードロップダウン */}
          {isModelPickerOpen && (
            <View className="mt-2 rounded-xl border border-gray-200 bg-white overflow-hidden">
              {models.map((model) => (
                <Pressable
                  key={model.id}
                  onPress={() => {
                    setSelectedModelId(model.id)
                    setIsModelPickerOpen(false)
                  }}
                  className={`flex-row items-center px-4 py-3 border-b border-gray-100 ${
                    model.id === effectiveModelId ? 'bg-gray-50' : ''
                  }`}
                >
                  <View
                    className="w-2.5 h-2.5 rounded-full mr-3"
                    style={{ backgroundColor: model.color }}
                  />
                  <Text
                    className="text-sm flex-1"
                    style={{
                      color: model.id === effectiveModelId ? model.color : '#374151',
                      fontWeight: model.id === effectiveModelId ? '600' : '400',
                    }}
                  >
                    {model.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* ドロワーオーバーレイ */}
      {isDrawerOpen && (
        <Pressable
          onPress={() => toggleDrawer(false)}
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
        />
      )}

      {/* ドロワー */}
      <Animated.View
        className="absolute top-0 bottom-0 left-0 bg-gray-50 border-r border-gray-200"
        style={{
          width: DRAWER_WIDTH,
          transform: [{ translateX: drawerAnim }],
          paddingTop: insets.top,
        }}
      >
        {/* ドロワーヘッダー */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
          <Text className="text-sm font-semibold text-gray-700">チャット履歴</Text>
          <Pressable onPress={() => toggleDrawer(false)} className="p-1.5">
            <X size={18} color="#6b7280" />
          </Pressable>
        </View>

        {/* セッション一覧 */}
        <ScrollView className="flex-1 px-3 py-3">
          {sessions.map((session) => (
            <Pressable
              key={session.id}
              onPress={() => handleSelectSession(session.id)}
              className={`rounded-lg p-3 mb-1 flex-row items-center justify-between ${
                currentSessionId === session.id ? 'bg-gray-200' : ''
              }`}
            >
              <Text className="text-sm text-gray-700 flex-1 mr-2" numberOfLines={1}>
                {session.title}
              </Text>
              <Pressable
                onPress={() => handleDeleteSession(session.id)}
                className="p-1 rounded"
                hitSlop={8}
              >
                <Trash2 size={14} color="#9ca3af" />
              </Pressable>
            </Pressable>
          ))}
        </ScrollView>

        {/* 設定メニュー (折りたたみ) */}
        <View className="border-t border-gray-200 pt-1 pb-5">
          {isDrawerSettingsOpen && (
            <View className="border-t border-gray-200 bg-white rounded-lg mx-2 mb-1 overflow-hidden">
              <TouchableOpacity
                className="flex-row items-center gap-2.5 px-4 py-3 rounded-lg mx-2 my-0.5"
                onPress={() => {
                  setIsDrawerSettingsOpen(false)
                  toggleDrawer(false)
                  router.push('/setting/plan')
                }}
              >
                <Text className="text-sm text-gray-700">プラン変更</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center gap-2.5 px-4 py-3 rounded-lg mx-2 my-0.5"
                onPress={() => {
                  setIsDrawerSettingsOpen(false)
                  toggleDrawer(false)
                  router.push('/setting/payment')
                }}
              >
                <Text className="text-sm text-gray-700">お支払い方法</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity
            className={`flex-row items-center gap-2.5 px-4 py-3 rounded-lg mx-2 my-0.5 ${
              isDrawerSettingsOpen ? 'bg-gray-200' : ''
            }`}
            onPress={() => setIsDrawerSettingsOpen((v) => !v)}
          >
            <Settings size={16} color="#6B7280" />
            <Text className="text-sm text-gray-700">設定</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* プロフィールモーダル */}
      <Modal
        visible={isProfileOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsProfileOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/30 justify-start items-end pr-3"
          style={{ paddingTop: insets.top + 60 }}
          onPress={() => setIsProfileOpen(false)}
        >
          <Pressable
            className="bg-white rounded-xl min-w-[200px] overflow-hidden"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 12,
              elevation: 8,
            }}
            onPress={() => {}}
          >
            {user && (
              <View className="px-4 py-3 border-b border-gray-100">
                {user.fullName && (
                  <Text className="text-sm font-semibold text-gray-900 mb-0.5" numberOfLines={1}>
                    {user.fullName}
                  </Text>
                )}
                <Text className="text-xs text-gray-500" numberOfLines={1}>
                  {user.primaryEmailAddress?.emailAddress}
                </Text>
              </View>
            )}
            <TouchableOpacity className="px-4 py-3.5" onPress={handleSignOut}>
              <Text className="text-sm text-red-500">ログアウト</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
