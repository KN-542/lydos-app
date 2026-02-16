import { Platform, StyleSheet, type TextStyle } from 'react-native'
import Markdown from 'react-native-markdown-display'

interface Props {
  content: string
  dark?: boolean
}

const monoFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace'

export function MarkdownContent({ content, dark = false }: Props) {
  const textColor = dark ? '#ffffff' : '#111827'
  const codeBackground = dark ? 'rgba(255,255,255,0.15)' : '#f3f4f6'
  const codeBorder = dark ? 'rgba(255,255,255,0.2)' : '#e5e7eb'
  const blockquoteBorder = dark ? 'rgba(255,255,255,0.3)' : '#d1d5db'
  const hrColor = dark ? 'rgba(255,255,255,0.2)' : '#e5e7eb'

  const baseText: TextStyle = { color: textColor, fontSize: 14, lineHeight: 22 }

  const styles = StyleSheet.create({
    body: baseText,
    heading1: { ...baseText, fontSize: 18, fontWeight: '700', marginTop: 12, marginBottom: 6 },
    heading2: { ...baseText, fontSize: 16, fontWeight: '700', marginTop: 10, marginBottom: 6 },
    heading3: { ...baseText, fontSize: 14, fontWeight: '700', marginTop: 10, marginBottom: 4 },
    paragraph: { ...baseText, marginTop: 0, marginBottom: 8 },
    strong: { fontWeight: '600' as const } as TextStyle,
    em: { fontStyle: 'italic' as const } as TextStyle,
    code_inline: {
      fontFamily: monoFont,
      fontSize: 12,
      backgroundColor: codeBackground,
      color: textColor,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 4,
    },
    fence: {
      fontFamily: monoFont,
      fontSize: 12,
      backgroundColor: codeBackground,
      color: textColor,
      borderColor: codeBorder,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginVertical: 8,
    },
    code_block: {
      fontFamily: monoFont,
      fontSize: 12,
      backgroundColor: codeBackground,
      color: textColor,
      borderColor: codeBorder,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginVertical: 8,
    },
    blockquote: {
      borderLeftWidth: 2,
      borderLeftColor: blockquoteBorder,
      paddingLeft: 12,
      marginVertical: 8,
    },
    bullet_list: { marginBottom: 8 },
    ordered_list: { marginBottom: 8 },
    list_item: { ...baseText, marginBottom: 2 },
    hr: { borderColor: hrColor, borderWidth: 0.5, marginVertical: 12 },
    link: { color: dark ? '#93c5fd' : '#3b82f6', textDecorationLine: 'underline' as const },
    table: {
      borderColor: codeBorder,
      borderWidth: 1,
      borderRadius: 4,
      marginVertical: 8,
    },
    tr: { borderBottomWidth: 1, borderColor: codeBorder },
    td: { ...baseText, padding: 6 },
    th: { ...baseText, padding: 6, fontWeight: '600' as const },
  })

  return <Markdown style={styles}>{content}</Markdown>
}
