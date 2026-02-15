import { useClerk, useUser } from '@clerk/clerk-expo'
import { router } from 'expo-router'
import { Menu, Plus, Send, Settings, X } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
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
    setIsSettingsOpen(false)
    await signOut()
    router.replace('/')
  }

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageWrapper,
        item.role === 'user' ? styles.messageWrapperUser : styles.messageWrapperAssistant,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          item.role === 'user' ? styles.messageBubbleUser : styles.messageBubbleAssistant,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            item.role === 'user' ? styles.messageTextUser : styles.messageTextAssistant,
          ]}
        >
          {item.content}
        </Text>
      </View>
      <Text style={styles.messageTime}>
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setIsDrawerOpen(true)}
          style={styles.headerButton}
          hitSlop={8}
        >
          <Menu size={22} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lydos</Text>
        <TouchableOpacity
          onPress={() => setIsSettingsOpen(true)}
          style={styles.headerButton}
          hitSlop={8}
        >
          <Settings size={22} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* チャットエリア */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>メッセージを入力してください</Text>
            </View>
          }
        />

        {/* 入力エリア */}
        <SafeAreaView edges={['bottom']} style={styles.inputArea}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="メッセージを入力..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendButton, !prompt.trim() && styles.sendButtonDisabled]}
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
        <Pressable style={styles.drawerOverlay} onPress={closeDrawer}>
          <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
            <Pressable style={styles.drawerContent} onPress={() => {}}>
              <View style={[styles.drawerHeader, { paddingTop: insets.top + 14 }]}>
                <Text style={styles.drawerTitle}>チャット履歴</Text>
                <View style={styles.drawerHeaderActions}>
                  <TouchableOpacity
                    onPress={createNewChat}
                    style={styles.drawerHeaderButton}
                    hitSlop={8}
                  >
                    <Plus size={20} color="#374151" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={closeDrawer}
                    style={styles.drawerHeaderButton}
                    hitSlop={8}
                  >
                    <X size={20} color="#374151" />
                  </TouchableOpacity>
                </View>
              </View>

              <FlatList
                data={chatHistories}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.chatHistoryItem,
                      currentChatId === item.id && styles.chatHistoryItemActive,
                    ]}
                    onPress={() => {
                      setCurrentChatId(item.id)
                      closeDrawer()
                    }}
                  >
                    <Text style={styles.chatHistoryTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.chatHistoryEmpty}>履歴がありません</Text>}
              />
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* 設定モーダル */}
      <Modal
        visible={isSettingsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSettingsOpen(false)}
      >
        <Pressable
          style={[styles.settingsOverlay, { paddingTop: insets.top + 60 }]}
          onPress={() => setIsSettingsOpen(false)}
        >
          <Pressable style={styles.settingsMenu} onPress={() => {}}>
            {user && (
              <View style={styles.settingsUserInfo}>
                <Text style={styles.settingsUserEmail} numberOfLines={1}>
                  {user.primaryEmailAddress?.emailAddress}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => {
                setIsSettingsOpen(false)
                router.push('/(authenticated)/setting/plan')
              }}
            >
              <Text style={styles.settingsItemText}>プラン変更</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => {
                setIsSettingsOpen(false)
                router.push('/(authenticated)/setting/payment')
              }}
            >
              <Text style={styles.settingsItemText}>お支払い方法</Text>
            </TouchableOpacity>

            <View style={styles.settingsDivider} />

            <TouchableOpacity style={styles.settingsItem} onPress={handleSignOut}>
              <Text style={[styles.settingsItemText, styles.settingsItemDanger]}>ログアウト</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // ヘッダー
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },

  // チャットエリア
  chatArea: {
    flex: 1,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },

  // メッセージ
  messageWrapper: {
    marginBottom: 16,
  },
  messageWrapperUser: {
    alignItems: 'flex-end',
  },
  messageWrapperAssistant: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  messageBubbleUser: {
    backgroundColor: '#374151',
  },
  messageBubbleAssistant: {
    backgroundColor: '#F3F4F6',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageTextUser: {
    color: '#fff',
  },
  messageTextAssistant: {
    color: '#111827',
  },
  messageTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    marginHorizontal: 4,
  },

  // 入力エリア
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },

  // サイドドロワー
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    flexDirection: 'row',
  },
  drawer: {
    width: '75%',
    maxWidth: 300,
    backgroundColor: '#F9FAFB',
    height: '100%',
  },
  drawerContent: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  drawerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  drawerHeaderActions: {
    flexDirection: 'row',
    gap: 4,
  },
  drawerHeaderButton: {
    padding: 4,
  },
  chatHistoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  chatHistoryItemActive: {
    backgroundColor: '#E5E7EB',
  },
  chatHistoryTitle: {
    fontSize: 14,
    color: '#374151',
  },
  chatHistoryEmpty: {
    paddingHorizontal: 16,
    paddingTop: 16,
    fontSize: 13,
    color: '#9CA3AF',
  },

  // 設定モーダル
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: 12,
  },
  settingsMenu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 200,
    overflow: 'hidden',
  },
  settingsUserInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingsUserEmail: {
    fontSize: 13,
    color: '#6B7280',
  },
  settingsItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsItemText: {
    fontSize: 15,
    color: '#111827',
  },
  settingsDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  settingsItemDanger: {
    color: '#EF4444',
  },
})
