# りんご会♪ セットアップガイド

このガイドは、「りんご会♪」Webアプリケーションの開発環境をセットアップするための手順を説明します。

---

## 1. 必要なツール

- **Node.js** (v18以降)
- **Python** (v3.9以降)
- **Docker** (Supabaseのローカル開発用)
- **Git**

---

## 2. プロジェクトのクローン

```bash
git clone <リポジトリのURL>
cd ringo-kai
```

---

## 3. Supabaseのセットアップ

### 3.1. Supabaseプロジェクトの作成

1. [Supabase公式サイト](https://supabase.com/)にアクセスし、新しいプロジェクトを作成します。
2. プロジェクト名、データベースのパスワード、リージョンを設定します。
3. プロジェクトが作成されたら、`Settings` > `API` に移動し、以下の情報を控えておきます。
   - **Project URL**
   - **Project API Keys** (`anon` と `service_role`)

### 3.2. データベーススキーマの適用

1. Supabaseプロジェクトの `SQL Editor` に移動します。
2. `TECHNICAL_SPECIFICATION.md` の「4. データベーススキーマ」セクションにあるSQLをコピー＆ペーストし、実行します。

### 3.3. 認証の設定

1. Supabaseプロジェクトの `Authentication` > `Providers` に移動します。
2. `Email` プロバイダーを有効にします。
3. `Confirm email` のチェックを外しておくと、開発が容易になります（本番環境では有効にすること）。

---

## 4. フロントエンドのセットアップ (Next.js on Vercel)

### 4.1. 環境変数の設定

フロントエンドのルートディレクトリに `.env.local` ファイルを作成し、以下の内容を記述します。

```
NEXT_PUBLIC_SUPABASE_URL=<SupabaseのProject URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabaseのanonキー>
```

### 4.2. 依存関係のインストールと実行

```bash
cd frontend
npm install
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスすると、フロントエンドが表示されます。

---

## 5. バックエンドのセットアップ (FastAPI on Render)

### 5.1. 環境変数の設定

バックエンドのルートディレクトリに `.env` ファイルを作成し、以下の内容を記述します。

```
SUPABASE_URL=<SupabaseのProject URL>
SUPABASE_SERVICE_KEY=<Supabaseのservice_roleキー>
OPENAI_API_KEY=<あなたのOpenAI APIキー>
RESEND_API_KEY=<あなたのResend APIキー>
```

### 5.2. 依存関係のインストールと実行

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

ブラウザで `http://localhost:8000/docs` にアクセスすると、APIのドキュメントが表示されます。

---

## 6. 素材ファイルの配置

`ringo_kai_assets.zip` を解凍し、中身をフロントエンドの `public/images` ディレクトリにコピーします。

```bash
unzip ringo_kai_assets.zip
cp -r ringo_kai_assets/* frontend/public/images/
```

---

## 7. デプロイ

### 7.1. フロントエンド (Vercel)

1. [Vercel公式サイト](https://vercel.com/)にアクセスし、GitHubリポジトリを連携します。
2. フレームワークとして `Next.js` を選択します。
3. 環境変数を設定します（`NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY`）。
4. `Deploy` ボタンをクリックします。

### 7.2. バックエンド (Render)

1. [Render公式サイト](https://render.com/)にアクセスし、`New` > `Web Service` を選択します。
2. GitHubリポジトリを連携します。
3. 環境として `Python` を選択します。
4. ビルドコマンドとして `pip install -r requirements.txt` を設定します。
5. スタートコマンドとして `uvicorn main:app --host 0.0.0.0 --port $PORT` を設定します。
6. 環境変数を設定します（`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`）。
7. `Create Web Service` ボタンをクリックします。

---

## 8. トラブルシューティング

- **CORSエラーが発生する場合**: FastAPIのCORS設定を確認してください。
- **認証がうまくいかない場合**: SupabaseのURLとキーが正しいか確認してください。
- **画像が表示されない場合**: `ASSETS_GUIDE.md` のトラブルシューティングセクションを参照してください。
