import { router } from 'expo-router'
import { CheckCircle } from 'lucide-react-native'
import { Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function PaymentSuccessScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-sm rounded-2xl bg-white p-8 items-center shadow-sm border border-gray-100">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle size={32} color="#16a34a" />
          </View>
          <Text className="text-2xl font-bold text-gray-900 mb-2">登録完了</Text>
          <Text className="text-sm text-gray-600 text-center mb-8">
            カード情報の登録が完了しました
          </Text>

          <View className="flex-row gap-x-3 w-full">
            <TouchableOpacity
              onPress={() => router.replace('/(authenticated)/setting/payment')}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3"
            >
              <Text className="text-center text-sm font-semibold text-gray-700">
                支払い方法を確認
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.replace('/(authenticated)/setting/plan')}
              className="flex-1 rounded-lg bg-gray-900 px-4 py-3"
            >
              <Text className="text-center text-sm font-semibold text-white">プランを選択</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}
