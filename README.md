# lydos-app

Lydos の React Native モバイルアプリ (Expo)。

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| UI Framework | React Native 0.81 + React 19 |
| Build Tool | Expo SDK 54 |
| 言語 | TypeScript 5.9 |
| パッケージマネージャ | Bun |
| Lint / Format | Biome 2.x |

---

## セットアップ

```bash
bun install
```

---

## コマンド

```bash
# 開発サーバー起動 (Expo Go / シミュレーター)
bun run start

# iOS シミュレーター
bun run ios

# Android エミュレーター
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
```

---

## ディレクトリ構成

```
lydos-app/
├── App.tsx          # ルートコンポーネント
├── index.ts         # エントリーポイント
├── app.json         # Expo 設定
├── biome.json       # Biome (Lint / Format) 設定
├── tsconfig.json    # TypeScript 設定
├── assets/          # 画像・フォント等の静的ファイル
└── node_modules/
```
