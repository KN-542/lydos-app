import { router } from 'expo-router'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// TODO: lydos-view の /home/setting/payment を参考に実装
export default function PaymentScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>お支払い方法</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={styles.body}>
        <Text style={styles.comingSoon}>Coming Soon</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  back: { fontSize: 15, color: '#6B7280' },
  title: { fontSize: 17, fontWeight: '600', color: '#111827' },
  placeholder: { width: 40 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  comingSoon: { fontSize: 16, color: '#9CA3AF' },
})
