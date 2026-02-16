import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useChangePlan } from '@/src/hooks/setting/useChangePlan'
import { usePaymentMethodsQuery } from '@/src/hooks/setting/usePaymentMethodsQuery'
import { usePlansQuery } from '@/src/hooks/setting/usePlansQuery'

type SelectedPlan = {
  id: number
  name: string
  price: number
}

export default function PlanScreen() {
  const { data: plansData, isLoading: isPlansLoading, isError: isPlansError } = usePlansQuery()
  const {
    data: paymentData,
    isLoading: isPaymentLoading,
    isError: isPaymentError,
  } = usePaymentMethodsQuery()
  const { mutate: changePlan, isPending } = useChangePlan()

  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null)
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('')
  const [isPaymentListOpen, setIsPaymentListOpen] = useState(false)

  const isLoading = isPlansLoading || isPaymentLoading
  const isError = isPlansError || isPaymentError

  const handleSelectPlan = (plan: SelectedPlan) => {
    const defaultPm = paymentData?.paymentMethods.find((pm) => pm.isDefault)
    setSelectedPlan(plan)
    setSelectedPaymentMethodId(defaultPm?.id ?? paymentData?.paymentMethods[0]?.id ?? '')
    setIsPaymentListOpen(false)
  }

  const handleConfirm = () => {
    if (!selectedPlan || !selectedPaymentMethodId) return
    changePlan(
      { planId: selectedPlan.id, paymentMethodId: selectedPaymentMethodId },
      {
        onSuccess: () => {
          setSelectedPlan(null)
          setSelectedPaymentMethodId('')
          setIsPaymentListOpen(false)
        },
      }
    )
  }

  const selectedPmDetail = paymentData?.paymentMethods.find(
    (pm) => pm.id === selectedPaymentMethodId
  )

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text className="text-[15px] text-gray-500">← 戻る</Text>
        </TouchableOpacity>
        <Text className="text-[17px] font-semibold text-gray-900">プラン変更</Text>
        <View className="w-10" />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#111827" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-red-500 text-center">データの取得に失敗しました</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="p-4 gap-y-4">
          {plansData?.plans.map((plan) => (
            <View
              key={plan.id}
              className={
                plan.isSelected
                  ? 'rounded-xl border-2 border-green-500 bg-green-50 p-6'
                  : 'rounded-xl border-2 border-gray-200 bg-white p-6'
              }
            >
              <View className="items-center">
                <Text className="text-xl font-bold text-gray-900">{plan.name}</Text>
                <View className="mt-3 flex-row items-baseline">
                  <Text className="text-2xl font-bold text-gray-900">
                    ¥{plan.price.toLocaleString()}
                  </Text>
                  <Text className="text-gray-500 ml-1"> / 月</Text>
                </View>
                <Text className="mt-3 text-sm text-gray-600 text-center">{plan.description}</Text>
              </View>
              <TouchableOpacity
                disabled={plan.isSelected}
                onPress={() =>
                  handleSelectPlan({ id: plan.id, name: plan.name, price: plan.price })
                }
                className={
                  plan.isSelected
                    ? 'mt-6 rounded-lg px-6 py-3 bg-green-500 opacity-60'
                    : 'mt-6 rounded-lg px-6 py-3 bg-gray-900'
                }
              >
                <Text className="text-center text-sm font-semibold text-white">
                  {plan.isSelected ? '✓ 現在のプラン' : 'このプランを選択'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          {selectedPlan !== null && (
            <View className="rounded-xl border border-gray-200 bg-white p-6">
              <Text className="text-base font-semibold text-gray-900 mb-4">お支払い方法</Text>

              {paymentData?.paymentMethods.length === 0 ? (
                <Text className="text-sm text-gray-500">
                  支払い方法が登録されていません。先にお支払い方法を登録してください。
                </Text>
              ) : (
                <View className="gap-y-3">
                  {selectedPmDetail && (
                    <View className="flex-row items-center gap-x-3 rounded-lg border border-gray-900 bg-gray-50 p-4">
                      <View className="h-5 w-5 rounded-full border-2 border-gray-900 items-center justify-center">
                        <View className="h-2.5 w-2.5 rounded-full bg-gray-900" />
                      </View>
                      <Text className="text-sm font-medium capitalize text-gray-900 flex-1">
                        {selectedPmDetail.brand} **** {selectedPmDetail.last4}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {selectedPmDetail.expMonth}/{selectedPmDetail.expYear}
                      </Text>
                    </View>
                  )}

                  {paymentData && paymentData.paymentMethods.length > 1 && (
                    <TouchableOpacity onPress={() => setIsPaymentListOpen((prev) => !prev)}>
                      <Text className="text-sm text-gray-600 underline">
                        {isPaymentListOpen ? '閉じる' : '支払い方法を変更'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {isPaymentListOpen && (
                    <View className="gap-y-2 pt-1">
                      {paymentData?.paymentMethods
                        .filter((pm) => pm.id !== selectedPaymentMethodId)
                        .map((pm) => (
                          <TouchableOpacity
                            key={pm.id}
                            onPress={() => {
                              setSelectedPaymentMethodId(pm.id)
                              setIsPaymentListOpen(false)
                            }}
                            className="flex-row items-center gap-x-3 rounded-lg border border-gray-200 p-4"
                          >
                            <View className="h-5 w-5 rounded-full border-2 border-gray-300 items-center justify-center" />
                            <Text className="text-sm font-medium capitalize text-gray-900 flex-1">
                              {pm.brand} **** {pm.last4}
                            </Text>
                            <Text className="text-xs text-gray-500">
                              {pm.expMonth}/{pm.expYear}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </View>
                  )}
                </View>
              )}

              <View className="border-b border-gray-200 my-6" />

              <View className="gap-y-1 mb-6">
                <Text className="text-sm text-gray-500">変更後のプラン</Text>
                <Text className="text-base font-semibold text-gray-900">{selectedPlan.name}</Text>
                <Text className="text-sm text-gray-700">
                  ¥{selectedPlan.price.toLocaleString()}
                  <Text className="text-gray-500"> / 月</Text>
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleConfirm}
                disabled={!selectedPaymentMethodId || isPending}
                className={
                  !selectedPaymentMethodId || isPending
                    ? 'rounded-lg bg-gray-900 px-6 py-3 opacity-50'
                    : 'rounded-lg bg-gray-900 px-6 py-3'
                }
              >
                <Text className="text-center text-sm font-semibold text-white">
                  {isPending ? '処理中...' : 'お支払いを確定する'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
