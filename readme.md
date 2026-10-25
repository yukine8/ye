# ye

シンプルで、高速で、大量のブックマークを置けて、同期ができる新しいタブ

![Image](https://github.com/user-attachments/assets/f8e96c05-d008-4bf8-91cb-c76b47e6dbfe)

# 使い方

### 新しいタブの編集

拡張機能の設定ページ（新しいタブの右上の歯車）からブックマークを編集できます

編集内容は、ブラウザのブックマークの以下のフォルダに保存されます

- Chrome: `その他のブックマーク` > `ye`

- Firefox: `他のブックマーク` > `ye`

`options` フォルダには、設定が保存されます

設定もブックマークとして保存されるため、自動で同期されます

「非表示」にしたブックマークとフォルダーは、その端末だけの設定で、同期されません

### 同期

ブラウザ標準の同期機能を利用します

異なるブラウザで同期したい場合は、[flocuss](https://floccus.org/) 等の外部ツールを併用してください

# 開発環境

[WXT](https://wxt.dev/) + TypeScript で作っています

パッケージ管理は `pnpm` です

### セットアップ

必要なもの

- Node.js
- pnpm
- VSCode 拡張機能の `Biome` と `Prettier`

```bash
pnpm install
```

`postinstall` で `wxt prepare` が走り、`.wxt/`（型定義など）が生成されます

### formatter の担当

- `Prettier`: HTML, Markdown

- `Biome`: CSS, TypeScript, JSON

VSCode の保存時フォーマットで自動適用されます（`.vscode/settings.json`）

### テスト

```bash
pnpm test      # ユニットテスト(Vitest)
pnpm compile   # 型の検査
```

`tests/` にあります。ブラウザは使わず、データの編集、IDの処理、設定、バックアップ、ブックマークへの反映を確かめます

画面（ドラッグ＆ドロップなど）のテストはありません

### 開発

Chrome: `pnpm dev`
Firefox: `pnpm:dev:firefox`

### ビルド

出力先は `.output/` です

Chrome: `pnpm build`
Firefox: `pnpm build:firefox`

### ストア公開用のビルド

ビルドしてzipにまとめます

Chrome: `pnpm zip`
Firefox: `pnpm zip:firefox`

Firefox の審査ではソースコードの提出を求められるため、`sources.zip` も一緒に作られます
