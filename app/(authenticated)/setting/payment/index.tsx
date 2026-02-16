import { useQueryClient } from '@tanstack/react-query'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { CreditCard } from 'lucide-react-native'
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useCreateCheckoutSession } from '@/src/hooks/setting/useCreateCheckoutSession'
import { useDeletePaymentMethod } from '@/src/hooks/setting/useDeletePaymentMethod'
import { usePaymentMethodsQuery } from '@/src/hooks/setting/usePaymentMethodsQuery'

export default function PaymentScreen() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = usePaymentMethodsQuery()
  const { mutate, isPending } = useCreateCheckoutSession()
  const { mutate: deletePaymentMethod, isPending: isDeleting } = useDeletePaymentMethod()

  const hasPaymentMethod = (data?.paymentMethods.length ?? 0) > 0
  const isPaymentMethodLimitReached = (data?.paymentMethods.length ?? 0) >= 5

  const handleOpenCheckout = () => {
    const previousCount = data?.paymentMethods.length ?? 0

    // Linking.createURL() が実行環境に応じて正しいスキームを返す
    //   Expo Go (Android): exp://127.0.0.1:8090/--/setting/payment/success
    //   Expo Go (iOS)    : exp://127.0.0.1:8081/--/setting/payment/success
    //   Dev/本番 build   : lydos://setting/payment/success
    const successUrl = Linking.createURL('setting/payment/success')
    const cancelUrl = Linking.createURL('setting/payment')

    mutate(
      { successUrl, cancelUrl },
      {
        onSuccess: async (result) => {
          // openAuthSessionAsync に successUrl を渡すことで、
          // そのスキームへのリダイレクト検知時にブラウザが自動で閉じる
          await WebBrowser.openAuthSessionAsync(result.checkoutUrl, successUrl)

          // ブラウザが閉じられたら（成功・キャンセル問わず）最新状態を取得
          await queryClient.refetchQueries({ queryKey: ['payment-methods'] })

          const updated = queryClient.getQueryData<{ paymentMethods: Array<unknown> }>([
            'payment-methods',
          ])
          if ((updated?.paymentMethods.length ?? 0) > previousCount) {
            router.replace('/(authenticated)/setting/payment/success')
          }
        },
        onError: () => {
          Alert.alert('エラー', '決済ページの準備に失敗しました')
        },
      }
    )
  }

  const handleDeletePaymentMethod = (paymentMethodId: string) => {
    Alert.alert('確認', 'このカードを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => deletePaymentMethod(paymentMethodId) },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text className="text-[15px] text-gray-500">← 戻る</Text>
        </TouchableOpacity>
        <Text className="text-[17px] font-semibold text-gray-900">お支払い方法</Text>
        <View className="w-10" />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#111827" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-red-500 text-center">データの取得に失敗しました</Text>
          <Text className="mt-2 text-sm text-red-400 text-center">
            {error instanceof Error ? error.message : ''}
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="p-4">
          <View className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
            {hasPaymentMethod ? (
              <>
                <View className="flex-row items-center justify-between mb-4">
                  <View>
                    <Text className="text-lg font-semibold text-gray-900">登録カード一覧</Text>
                    <Text className="mt-0.5 text-xs text-gray-500">
                      {data?.paymentMethods.length} / 5件（最大5枚まで登録できます）
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleOpenCheckout}
                    disabled={isPending || isPaymentMethodLimitReached}
                    className={
                      isPending || isPaymentMethodLimitReached
                        ? 'rounded-lg bg-gray-900 px-4 py-2 opacity-50'
                        : 'rounded-lg bg-gray-900 px-4 py-2'
                    }
                  >
                    <Text className="text-sm font-semibold text-white">
                      {isPending ? '準備中...' : 'カードを追加'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {isPaymentMethodLimitReached && (
                  <View className="mb-4 rounded-lg bg-yellow-50 px-4 py-3">
                    <Text className="text-sm text-yellow-800">
                      登録上限（5枚）に達しています。新しいカードを追加するには、既存のカードを削除してください。
                    </Text>
                  </View>
                )}

                <View className="gap-y-3">
                  {data?.paymentMethods.map((method) => (
                    <View
                      key={method.id}
                      className="flex-row items-center justify-between rounded-lg border border-gray-200 p-4"
                    >
                      <View className="flex-row items-center flex-1">
                        <View className="mr-3 h-12 w-16 items-center justify-center rounded bg-gray-100">
                          <CreditCard size={24} color="#4b5563" />
                        </View>
                        <View className="flex-1">
                          <Text className="font-semibold text-gray-900 capitalize">
                            {method.brand}
                          </Text>
                          <Text className="text-sm text-gray-600">**** {method.last4}</Text>
                          <Text className="text-xs text-gray-500">
                            有効期限: {method.expMonth}/{method.expYear}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeletePaymentMethod(method.id)}
                        disabled={isDeleting}
                        className={
                          isDeleting
                            ? 'rounded-lg border border-red-300 px-3 py-1.5 opacity-50'
                            : 'rounded-lg border border-red-300 px-3 py-1.5'
                        }
                      >
                        <Text className="text-sm font-medium text-red-600">削除</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {isPending && (
                  <View className="mt-4 flex-row items-center justify-center">
                    <ActivityIndicator size="small" color="#111827" />
                    <Text className="ml-2 text-sm text-gray-600">
                      決済ページを準備しています...
                    </Text>
                  </View>
                )}

                <View className="mt-6 items-end">
                  <TouchableOpacity
                    onPress={() => router.push('/(authenticated)/setting/plan')}
                    className="rounded-lg border border-gray-300 bg-white px-6 py-2"
                  >
                    <Text className="text-sm font-semibold text-gray-700">プラン選択へ</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text className="text-lg font-semibold text-gray-900 mb-2">カード情報の登録</Text>
                <Text className="text-sm text-gray-600 mb-1">
                  Stripeの安全な決済ページでカード情報を登録します。{'\n'}
                  ボタンをタップすると、外部の決済ページに移動します。
                </Text>
                <Text className="text-xs text-gray-500 mb-6">最大5枚まで登録できます。</Text>

                <TouchableOpacity
                  onPress={handleOpenCheckout}
                  disabled={isPending}
                  className={
                    isPending
                      ? 'rounded-lg bg-gray-900 px-6 py-3 opacity-50'
                      : 'rounded-lg bg-gray-900 px-6 py-3'
                  }
                >
                  <Text className="text-center text-sm font-semibold text-white">
                    {isPending ? '準備中...' : 'カード情報を登録'}
                  </Text>
                </TouchableOpacity>

                {isPending && (
                  <View className="mt-4 flex-row items-center justify-center">
                    <ActivityIndicator size="small" color="#111827" />
                    <Text className="ml-2 text-sm text-gray-600">
                      決済ページを準備しています...
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
