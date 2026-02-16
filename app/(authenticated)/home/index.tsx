import { useClerk, useUser } from '@clerk/clerk-expo'
import { router } from 'expo-router'
import { Menu, Plus, Send, Settings, X } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatHistory {
  id: string
  title: string
  lastMessage: Date
}

// TODO: バックエンド連携
export default function ChatScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useUser()
  const { signOut } = useClerk()
  const [messages, setMessages] = useState<Message[]>([])
  const [prompt, setPrompt] = useState('')
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isDrawerSettingsOpen, setIsDrawerSettingsOpen] = useState(false)
  const flatListRef = useRef<FlatList<Message>>(null)
  const drawerAnim = useRef(new Animated.Value(-400)).current

  useEffect(() => {
    if (isDrawerOpen) {
      Animated.timing(drawerAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start()
    }
  }, [isDrawerOpen, drawerAnim])

  const closeDrawer = () => {
    Animated.timing(drawerAnim, {
      toValue: -400,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setIsDrawerOpen(false)
      drawerAnim.setValue(-400)
    })
  }

  const createNewChat = () => {
    setCurrentChatId(null)
    setMessages([])
    closeDrawer()
  }

  const handleSendMessage = () => {
    if (prompt.trim() === '') return

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    }

    const aiResponse: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: 'ご質問ありがとうございます。現在はデザインプレビューモードです。',
      timestamp: new Date(),
    }

    if (messages.length === 0) {
      const newChatId = Date.now().toString()
      const newChat: ChatHistory = {
        id: newChatId,
        title: prompt.length > 20 ? `${prompt.slice(0, 20)}...` : prompt,
        lastMessage: new Date(),
      }
      setChatHistories([newChat, ...chatHistories])
      setCurrentChatId(newChatId)
    }

    setMessages([...messages, newMessage, aiResponse])
    setPrompt('')
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
  }

  const handleSignOut = async () => {
    setIsProfileOpen(false)
    await signOut()
    router.replace('/')
  }

  const renderMessage = ({ item }: { item: Message }) => (
    <View className={`mb-4${item.role === 'user' ? ' items-end' : ' items-start'}`}>
      <View
        className={`max-w-[80%] rounded-[18px] px-4 py-[10px]${item.role === 'user' ? ' bg-gray-700' : ' bg-gray-100'}`}
      >
        <Text
          className={`text-[15px] leading-[22px]${item.role === 'user' ? ' text-white' : ' text-gray-900'}`}
        >
          {item.content}
        </Text>
      </View>
      <Text className="text-[11px] text-gray-400 mt-1 mx-1">
        {item.timestamp.toLocaleString('ja-JP', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  )

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* ヘッダー */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <TouchableOpacity onPress={() => setIsDrawerOpen(true)} className="p-1" hitSlop={8}>
          <Menu size={22} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Lydos</Text>
        <TouchableOpacity onPress={() => setIsProfileOpen(true)} className="p-1" hitSlop={8}>
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
        </TouchableOpacity>
      </View>

      {/* チャットエリア */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 8, flexGrow: 1 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-20">
              <Text className="text-sm text-gray-400">メッセージを入力してください</Text>
            </View>
          }
        />

        {/* 入力エリア */}
        <SafeAreaView edges={['bottom']} className="border-t border-gray-200 bg-white">
          <View className="flex-row items-end px-3 py-[10px] gap-2">
            <TextInput
              className="flex-1 min-h-[44px] max-h-[120px] border border-gray-300 rounded-[22px] px-4 py-[10px] text-[15px] text-gray-900 bg-gray-50"
              value={prompt}
              onChangeText={setPrompt}
              placeholder="メッセージを入力..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              className={`w-11 h-11 rounded-[22px] bg-gray-900 items-center justify-center${!prompt.trim() ? ' opacity-40' : ''}`}
              onPress={handleSendMessage}
              disabled={!prompt.trim()}
            >
              <Send size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* サイドドロワー（チャット履歴） */}
      <Modal visible={isDrawerOpen} transparent animationType="none" onRequestClose={closeDrawer}>
        <Pressable className="flex-1 bg-black/40 flex-row" onPress={closeDrawer}>
          <Animated.View
            className="w-3/4 max-w-[300px] bg-gray-50 h-full"
            style={{ transform: [{ translateX: drawerAnim }] }}
          >
            <Pressable className="flex-1" onPress={() => {}}>
              <View
                className="flex-row items-center justify-between px-4 py-[14px] border-b border-gray-200"
                style={{ paddingTop: insets.top + 14 }}
              >
                <Text className="text-[15px] font-semibold text-gray-700">チャット履歴</Text>
                <View className="flex-row gap-1">
                  <TouchableOpacity onPress={createNewChat} className="p-1" hitSlop={8}>
                    <Plus size={20} color="#374151" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={closeDrawer} className="p-1" hitSlop={8}>
                    <X size={20} color="#374151" />
                  </TouchableOpacity>
                </View>
              </View>

              <FlatList
                data={chatHistories}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className={`px-4 py-3 rounded-lg mx-2 my-0.5${currentChatId === item.id ? ' bg-gray-200' : ''}`}
                    onPress={() => {
                      setCurrentChatId(item.id)
                      closeDrawer()
                    }}
                  >
                    <Text className="text-sm text-gray-700" numberOfLines={1}>
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text className="px-4 pt-4 text-[13px] text-gray-400">履歴がありません</Text>
                }
              />

              {/* ドロワーフッター（設定） */}
              <View className="border-t border-gray-200 pt-1 pb-5">
                {isDrawerSettingsOpen && (
                  <View className="border-t border-gray-200 bg-white rounded-lg mx-2 mb-1 overflow-hidden">
                    <TouchableOpacity
                      className="flex-row items-center gap-[10px] px-4 py-3 rounded-lg mx-2 my-0.5"
                      onPress={() => {
                        setIsDrawerSettingsOpen(false)
                        router.push('/(authenticated)/setting/plan')
                        closeDrawer()
                      }}
                    >
                      <Text className="text-sm text-gray-700">プラン変更</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-row items-center gap-[10px] px-4 py-3 rounded-lg mx-2 my-0.5"
                      onPress={() => {
                        setIsDrawerSettingsOpen(false)
                        router.push('/(authenticated)/setting/payment')
                        closeDrawer()
                      }}
                    >
                      <Text className="text-sm text-gray-700">お支払い方法</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity
                  className={`flex-row items-center gap-[10px] px-4 py-3 rounded-lg mx-2 my-0.5${isDrawerSettingsOpen ? ' bg-gray-200' : ''}`}
                  onPress={() => setIsDrawerSettingsOpen((v) => !v)}
                >
                  <Settings size={16} color="#6B7280" />
                  <Text className="text-sm text-gray-700">設定</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

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
            className="bg-white rounded-xl shadow-md min-w-[200px] overflow-hidden"
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
                <Text className="text-[13px] text-gray-500" numberOfLines={1}>
                  {user.primaryEmailAddress?.emailAddress}
                </Text>
              </View>
            )}

            <View className="h-px bg-gray-100" />

            <TouchableOpacity className="px-4 py-[14px]" onPress={handleSignOut}>
              <Text className="text-[15px] text-red-500">ログアウト</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}
