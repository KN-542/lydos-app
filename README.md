# lydos-app

Lydos の React Native モバイルアプリ (Expo)。

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| UI Framework | React Native 0.81 + React 19 |
| Build Tool | Expo SDK 54 |
| ルーティング | Expo Router 6.x (ファイルベース) |
| サーバーステート | TanStack Query 5.x |
| 認証 | Clerk (`@clerk/clerk-expo`) |
| API クライアント | openapi-fetch (型自動生成) |
| アイコン | lucide-react-native |
| 言語 | TypeScript 5.9 |
| パッケージマネージャ | Bun |
| Lint / Format | Biome 2.x |

---

## セットアップ

```bash
bun install
```

`.env` ファイルを作成し、以下を設定してください。

```env
EXPO_PUBLIC_API_URL=https://local.api.lydos
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

---

## コマンド

```bash
# 開発サーバー起動 (Expo Go / シミュレーター)
bun run start

# iOS シミュレーター
bun run ios

# Android エミュレーター (ポート 8090)
bun run android

# Web ブラウザ
bun run web

# 型チェック
bun run typecheck

# Lint / Format 自動修正
bun run lint

# フォーマット自動修正
bun run format

# フォーマット確認のみ
bun run format:check

# API 型定義の再生成 (lydos-api 起動後に実行)
bun run generate:api
```

---

## ルート構成

```
app/
├── _layout.tsx                        # ルートレイアウト (ClerkProvider + QueryClientProvider)
├── index.tsx                          # ログイン画面
├── sign-up.tsx                        # 新規登録画面 (メール確認あり)
└── (authenticated)/
    ├── _layout.tsx                    # 認証ガード
    └── home/
        └── index.tsx                  # チャット画面

src/
├── components/
│   └── AuthProvider.tsx               # Clerk トークンを API クライアントに設定
├── hooks/
│   └── useRequireAuth.ts              # 認証状態チェック・未認証時リダイレクト
└── lib/
    ├── api.ts                         # openapi-fetch クライアント
    ├── api-types.ts                   # 自動生成型 (generate:api で更新)
    ├── openapi.json                   # OpenAPI スキーマ (generate:api で更新)
    └── tokenCache.ts                  # Clerk トークンの SecureStore キャッシュ
```

---

## 認証フロー

1. `ClerkProvider` がアプリ全体をラップ
2. `useRequireAuth` で認証状態をチェック → 未認証時 `/` にリダイレクト
3. `(authenticated)/_layout.tsx` が認証ガードとして機能
4. `AuthProvider` が Clerk トークンを API クライアントに注入
