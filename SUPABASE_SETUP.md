# Supabase セットアップ手順

## 1. Supabase ダッシュボードでの作業

### SQL エディタでマイグレーション実行

1. https://supabase.com/dashboard にアクセス
2. プロジェクトを選択
3. 左メニューから **SQL Editor** をクリック
4. **New query** をクリック
5. 以下のファイルの内容をコピー＆ペーストして実行：

**実行順序：**
```
1. backend/supabase/migrations/00_initial_schema.sql (初期スキーマ)
2. backend/supabase/migrations/20251227_create_wishlist_items.sql
3. backend/supabase/migrations/20251227_create_system_metrics.sql
4. backend/supabase/migrations/20251227_create_rtp_snapshots.sql
```

## 2. Storage バケットの確認

### ダッシュボードで確認
1. 左メニューから **Storage** をクリック
2. `purchase-screenshots` バケットが存在することを確認
3. バケットをクリックして **Settings** タブへ
4. **Public bucket** が有効になっていることを確認

### 手動作成（マイグレーションが失敗した場合）
1. **Storage** → **New bucket** をクリック
2. 以下の設定で作成：
   - **Name**: `purchase-screenshots`
   - **Public bucket**: ✅ ON
   - **File size limit**: 10 MB
   - **Allowed MIME types**: `image/png`, `image/jpeg`

## 3. テーブル確認

### Table Editor で確認
1. 左メニューから **Table Editor** をクリック
2. 以下のテーブルが存在することを確認：
   - ✅ users
   - ✅ purchases
   - ✅ apples
   - ✅ referrals
   - ✅ wishlist_items
   - ✅ system_metrics
   - ✅ rtp_snapshots

### purchases テーブルのカラム確認
`purchases` テーブルをクリックして、以下のカラムが存在することを確認：
- ✅ id
- ✅ purchaser_id
- ✅ target_user_id
- ✅ target_wishlist_url
- ✅ target_item_name
- ✅ target_item_price
- ✅ status
- ✅ **screenshot_url** ← これが重要！
- ✅ verification_status
- ✅ verification_result
- ✅ admin_notes
- ✅ created_at
- ✅ verified_at

## 4. 環境変数の確認

### バックエンド (Render)
以下の環境変数が正しく設定されているか確認：

```bash
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SCREENSHOT_BUCKET=purchase-screenshots
```

### SUPABASE_SERVICE_KEY の取得
1. Supabase ダッシュボード → **Settings** → **API**
2. **Project API keys** セクション
3. **service_role** キーをコピー（⚠️ secret キーです！安全に保管）

## 5. 動作確認

### Storageアップロードテスト
以下のコマンドでテストアップロードを実行：

```bash
curl -X POST https://your-backend.onrender.com/api/purchase/upload \
  -H "X-User-Id: test-uuid" \
  -F "purchase_id=1" \
  -F "file=@test-screenshot.png"
```

期待されるレスポンス:
```json
{
  "screenshot_url": "https://xxxxx.supabase.co/storage/v1/object/public/purchase-screenshots/..."
}
```

### エラーが出る場合

#### 1. `AttributeError: 'bool' object has no attribute 'encode'`
→ コードの修正が反映されていません。Render で最新コミット `0b37f78` がデプロイされているか確認

#### 2. `Bucket not found`
→ Storage バケットが作成されていません。上記「2. Storage バケットの確認」を実行

#### 3. `permission denied for table purchases`
→ SUPABASE_SERVICE_KEY が正しく設定されていません。service_role キーを使用してください

#### 4. `column "screenshot_url" does not exist`
→ purchases テーブルに screenshot_url カラムが存在しません。以下を実行：

```sql
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS target_item_price INT DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS verification_result TEXT;
```

## 6. トラブルシューティング

### ログ確認
- **バックエンドログ**: Render Dashboard → サービス → Logs
- **Supabase ログ**: Supabase Dashboard → Logs

### よくある問題

1. **RLS ポリシーでブロックされる**
   - サービスキーを使用している場合、RLS は無視されます
   - フロントエンドから直接アクセスする場合は、適切なポリシーが必要

2. **CORS エラー**
   - バックエンドの CORS 設定を確認
   - `FRONTEND_ORIGINS` 環境変数が正しく設定されているか確認

3. **アップロード後に URL が取得できない**
   - バケットが public に設定されているか確認
   - `get_public_url()` の戻り値の型を確認（dict または string）
