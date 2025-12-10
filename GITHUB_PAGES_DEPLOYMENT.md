# GitHub Pages デプロイ手順

## 1. GitHubリポジトリの作成
1. [GitHub](https://github.com)にアクセス
2. 「New repository」をクリック
3. リポジトリ名を入力（例：`moroga-order-system`）
4. 「Public」を選択
5. 「Create repository」をクリック

## 2. ファイルのアップロード
1. 作成したリポジトリのページで「uploading an existing file」をクリック
2. 以下のファイルをドラッグ&ドロップ：
   - `index.html`
   - `styles.css`
   - `script.js`
   - `management.html`
   - `management-styles.css`
   - `management.js`
   - `logo.png`
   - `stamp_moroga.png`
   - `stamp_okuyama.png`

## 3. GitHub Pages の有効化
1. リポジトリの「Settings」タブをクリック
2. 左サイドバーの「Pages」をクリック
3. 「Source」で「Deploy from a branch」を選択
4. 「Branch」で「main」を選択
5. 「Save」をクリック

## 4. サイトの確認
1. 数分待ってから「Actions」タブでデプロイ状況を確認
2. デプロイ完了後、`https://[ユーザー名].github.io/[リポジトリ名]` でアクセス

## 5. カスタムドメイン（オプション）
1. 独自ドメインを持っている場合
2. リポジトリの「Settings」→「Pages」でカスタムドメインを設定

## メリット
- 完全無料
- 自動デプロイ
- バージョン管理
- 高速アクセス

## 制限事項
- 静的サイトのみ
- サーバーサイド処理は不可
- 月1GB転送量まで
### デプロイ完了後のアクセス方法

- GitHub Pagesの設定画面（「Settings」→「Pages」）の「Your site is live at:」の右側に、公開URLが表示されます。
- そのURL（例: `https://[ユーザー名].github.io/[リポジトリ名]/`）をクリックすると、公開されたサイトにアクセスできます。
- または、リポジトリの「Code」タブ上部に「Environments」→「github-pages」→「View deployment」ボタンが表示される場合もあります。そこをクリックしてもアクセス可能です。
