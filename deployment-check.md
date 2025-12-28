# デプロイ確認手順

## 1. Render ダッシュボードでデプロイ状況を確認

- https://dashboard.render.com にアクセス
- バックエンドサービスを選択
- 最新のデプロイが完了しているか確認（緑のチェックマーク）
- デプロイログに `Build succeeded` と表示されているか確認

## 2. コミットハッシュの確認

最新コミット: `0b37f78`

```bash
git log --oneline -3
```

期待される出力:
```
0b37f78 fix(upload): ensure bucket creation also uses string for public option
c8f600f fix(upload): pass upsert as string not bool to storage3
f9f2d10 fix(upload): pass upsert option as string header to supabase storage
```

## 3. ブラウザキャッシュのクリア

- **Chrome/Edge**: Ctrl+Shift+Delete → キャッシュをクリア
- **ハードリロード**: Ctrl+Shift+R

## 4. 修正内容のサマリー

### 問題
storage3 SDK が boolean 値をヘッダーに渡すと、httpx が `.encode()` を呼び出して `AttributeError` が発生

### 修正
```python
# 修正前
{"content-type": content_type, "upsert": True}  # ❌ boolean
{"public": True}  # ❌ boolean

# 修正後
{"content-type": content_type, "upsert": "true"}  # ✅ 文字列
{"public": "true"}  # ✅ 文字列
```

## 5. デプロイ完了後の確認

1. https://ringokai.app/upload-screenshot にアクセス
2. スクリーンショットを選択
3. アップロードボタンをクリック
4. エラーが出ずに「アップロードが完了しました！」と表示されることを確認

## トラブルシューティング

まだエラーが出る場合：

1. **Renderのログを確認**
   - Dashboard → サービス → Logs
   - `AttributeError` が表示されていないか確認

2. **環境変数を確認**
   - `SUPABASE_URL` と `SUPABASE_SERVICE_KEY` が正しく設定されているか
   - `SCREENSHOT_BUCKET` の値（デフォルト: `purchase-screenshots`）

3. **バケットの確認**
   - Supabase Dashboard → Storage
   - `purchase-screenshots` バケットが存在するか
   - パブリックアクセスが有効か
