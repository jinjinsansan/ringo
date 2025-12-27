# 「りんご会♪」詳細ユーザーフロー仕様書

---

## ユーザーフロー全体図

```
①新規登録
  ↓
②ログイン
  ↓
③利用規約チェック（必須）
  ↓
④使い方ページを読んでチェック（必須）
  ↓
⑤誰かのAmazon欲しいものリストを決済
  ↓
⑥スクリーンショット提出
  ↓
⑦AI & 管理者判定
  ↓
⑧自分の欲しいものリストURL登録
  ↓
⑨りんごを引くページへ
  ↓
⑩りんごを引くボタンをクリック
  ↓
⑪24時間カウントダウン（徐々にりんごが見えてくる）
  ↓
⑫結果に応じて分岐
  ├─ 毒りんご → ⑤へ戻る
  ├─ ブロンズりんご → ⑤へ戻る
  └─ シルバー/ゴールド/赤りんご → チケット消化可能 + ⑤へ戻る
  
⑬友達紹介機能（初回ユーザーは⑥完了後に解放）
```

---

## 各ステップの詳細仕様

### ①新規登録

**ページ**：`/register`

**フォーム**：
- メールアドレス（必須）
- パスワード（8文字以上、英数字含む）
- パスワード確認

**バリデーション**：
- メールアドレス形式チェック
- パスワード強度チェック
- パスワード一致チェック

**データベース**：
```sql
INSERT INTO users (email, password_hash, created_at, status)
VALUES (?, ?, NOW(), 'registered');
```

**次のステップ**：
- 登録成功 → ②ログインページへ自動遷移
- 登録失敗 → エラーメッセージ表示

---

### ②ログイン

**ページ**：`/login`

**フォーム**：
- メールアドレス
- パスワード

**認証**：Supabase Auth

**次のステップ**：
- ログイン成功 → ユーザーの状態に応じて遷移
  - `status = 'registered'` → ③利用規約ページへ
  - `status = 'terms_agreed'` → ④使い方ページへ
  - `status = 'tutorial_completed'` → ⑤購入ページへ
  - `status = 'first_purchase_completed'` → ⑨りんごを引くページへ
  - `status = 'active'` → マイページへ

---

### ③利用規約チェック（必須）

**ページ**：`/terms`

**内容**：
- 利用規約の全文表示
- スクロールして最後まで読む必要がある
- 最後まで読むと、チェックボックスが有効化

**チェックボックス**：
```
□ 利用規約を読み、同意します（必須）
```

**ボタン**：
- 【次へ】ボタン（チェックボックスにチェックが入るまでグレーアウト）

**データベース**：
```sql
UPDATE users
SET status = 'terms_agreed', terms_agreed_at = NOW()
WHERE id = ?;
```

**次のステップ**：
- チェック完了 → ④使い方ページへ
- チェックなし → エラーメッセージ「利用規約に同意してください」

**エラー処理**：
- ユーザーが直接URLで④以降にアクセスしようとした場合
  - `status != 'terms_agreed'` → ③利用規約ページへ強制リダイレクト

---

### ④使い方ページを読んでチェック（必須）

**ページ**：`/tutorial`

**内容**：
- りんご会♪の使い方を説明
- イラスト付きで分かりやすく
- スクロールして最後まで読む必要がある

**チェックボックス**：
```
□ 使い方を読み、理解しました（必須）
```

**ボタン**：
- 【次へ】ボタン（チェックボックスにチェックが入るまでグレーアウト）

**データベース**：
```sql
UPDATE users
SET status = 'tutorial_completed', tutorial_completed_at = NOW()
WHERE id = ?;
```

**次のステップ**：
- チェック完了 → ⑤購入ページへ
- チェックなし → エラーメッセージ「使い方を読んで、チェックしてください」

**エラー処理**：
- ユーザーが直接URLで⑤以降にアクセスしようとした場合
  - `status != 'tutorial_completed'` → ④使い方ページへ強制リダイレクト

---

### ⑤誰かのAmazon欲しいものリストを決済

**ページ**：`/purchase`

**内容**：
1. **ランダムに選ばれた欲しいものリスト**を表示
   - ユーザー名（匿名化）
   - 商品名
   - 商品画像
   - 価格（3000円～4000円）
   - Amazon欲しいものリストへのリンク

2. **購入手順の説明**
   ```
   ① 下のボタンをクリックして、Amazonで商品を購入してください
   ② 購入完了後、スクリーンショットを撮影してください
   ③ スクリーンショットをアップロードしてください
   ```

3. **Amazonへのリンクボタン**
   ```
   【Amazonで購入する】
   ```

**データベース**：
```sql
-- 購入対象の欲しいものリストをランダムに選択
SELECT * FROM wishlists
WHERE status = 'active'
  AND user_id != ?  -- 自分以外
  AND purchase_count < purchase_limit  -- 購入上限に達していない
ORDER BY RANDOM()
LIMIT 1;

-- 購入レコードを作成
INSERT INTO purchases (user_id, wishlist_id, status, created_at)
VALUES (?, ?, 'pending', NOW());
```

**次のステップ**：
- Amazonで購入完了 → ⑥スクリーンショット提出ページへ

**エラー処理**：
- 購入可能な欲しいものリストがない場合
  - エラーメッセージ「現在、購入可能な欲しいものリストがありません。しばらくお待ちください。」

---

### ⑥スクリーンショット提出

**ページ**：`/upload-screenshot`

**内容**：
1. **購入した商品の情報**を表示
   - 商品名
   - 価格

2. **スクリーンショットアップロード**
   ```
   購入完了のスクリーンショットをアップロードしてください
   
   【ファイルを選択】
   
   ℹ️ 注意事項
   - 注文番号が見えるようにしてください
   - 商品名が見えるようにしてください
   - 金額が見えるようにしてください
   ```

3. **プレビュー表示**
   - アップロードした画像をプレビュー表示

4. **確認ボタン**
   ```
   【確認する】
   ```

**データベース**：
```sql
-- スクリーンショットをSupabase Storageにアップロード
-- URLをデータベースに保存
UPDATE purchases
SET screenshot_url = ?, status = 'screenshot_uploaded', screenshot_uploaded_at = NOW()
WHERE id = ?;
```

**次のステップ**：
- アップロード成功 → ⑦AI & 管理者判定へ
- アップロード失敗 → エラーメッセージ「画像のアップロードに失敗しました」

**エラー処理**：
- ファイルサイズが大きすぎる場合（10MB以上）
  - エラーメッセージ「ファイルサイズが大きすぎます。10MB以下の画像をアップロードしてください」
- ファイル形式が不正な場合（PNG、JPG以外）
  - エラーメッセージ「PNG または JPG 形式の画像をアップロードしてください」

---

### ⑦AI & 管理者判定

**ページ**：`/verification-pending`

**内容**：
```
購入確認中です

あなたのスクリーンショットを確認しています。
しばらくお待ちください。

確認が完了すると、メールでお知らせします。

【ホームに戻る】
```

**バックエンド処理**：

1. **AI自動確認（GPT-4 Vision API）**
   ```python
   def verify_screenshot(screenshot_url, expected_product_name, expected_price):
       # GPT-4 Vision APIで画像を解析
       result = openai.ChatCompletion.create(
           model="gpt-4-vision-preview",
           messages=[{
               "role": "user",
               "content": [
                   {"type": "text", "text": f"この画像はAmazonの購入完了画面ですか？商品名は「{expected_product_name}」、価格は約{expected_price}円ですか？注文番号は見えますか？"},
                   {"type": "image_url", "image_url": screenshot_url}
               ]
           }]
       )
       
       # 結果を解析
       if result['confidence'] > 0.8:
           return 'APPROVED'
       elif result['confidence'] > 0.5:
           return 'REVIEW_REQUIRED'
       else:
           return 'REJECTED'
   ```

2. **判定結果に応じた処理**
   - `APPROVED`：自動承認 → ⑧へ
   - `REVIEW_REQUIRED`：管理者確認待ち → 管理者パネルに通知
   - `REJECTED`：却下 → ユーザーに通知、⑥へ戻る

**データベース**：
```sql
UPDATE purchases
SET 
    verification_status = ?,
    verification_result = ?,
    verified_at = NOW()
WHERE id = ?;
```

**通知**：
- 承認時：メール送信（Resend）
- 却下時：メール送信 + アプリ内通知

**次のステップ**：
- 承認 → ⑧欲しいものリストURL登録ページへ
- 却下 → ⑥スクリーンショット再提出ページへ

---

### ⑧自分の欲しいものリストURL登録

**ページ**：`/register-wishlist`

**内容**：
```
あなたの欲しいものリストを登録してください

Amazonの欲しいものリストのURLを入力してください。

┌─────────────────────────────────┐
│ https://amazon.co.jp/...        │
└─────────────────────────────────┘

ℹ️ 注意事項
- 3000円～4000円の商品を登録してください
- 一度登録すると変更できません
- 複数のリストは登録できません

【確定する】
```

**バリデーション**：
1. Amazon URLの形式チェック
2. 欲しいものリストの公開設定チェック（スクレイピング）
3. 商品価格チェック（3000円～4000円）

**データベース**：
```sql
INSERT INTO wishlists (user_id, url, status, created_at)
VALUES (?, ?, 'active', NOW());

UPDATE users
SET status = 'first_purchase_completed', wishlist_registered_at = NOW()
WHERE id = ?;
```

**次のステップ**：
- 登録成功 → ⑨りんごを引くページへ
- 登録失敗 → エラーメッセージ表示

**エラー処理**：
- URL形式が不正
  - エラーメッセージ「正しいAmazon URLを入力してください」
- 欲しいものリストが非公開
  - エラーメッセージ「欲しいものリストを公開設定にしてください」
- 商品価格が範囲外
  - エラーメッセージ「3000円～4000円の商品を登録してください」

---

### ⑨りんごを引くページ

**ページ**：`/draw-apple`

**内容**：
```
りんごを引く

あなたの現在の状態：
- 紹介人数：0人
- りんご抽選権：1回

現在のりんご確率：
ブロンズ：55%
シルバー：20%
ゴールド：12%
赤いりんご：5%
毒りんご：8%

【りんごを引く】
```

**ボタンの状態**：
- りんご抽選権がある場合：有効
- りんご抽選権がない場合：グレーアウト + 「りんご抽選権がありません」

**データベース**：
```sql
-- りんご抽選権をチェック
SELECT apple_draw_rights FROM users WHERE id = ?;

-- りんご抽選権が0の場合はエラー
IF apple_draw_rights <= 0 THEN
    RETURN ERROR('りんご抽選権がありません');
END IF;
```

**次のステップ**：
- 【りんごを引く】ボタンをクリック → ⑩りんご抽選処理へ

---

### ⑩りんごを引くボタンをクリック

**処理**：

1. **りんご抽選**
   ```python
   def draw_apple(user_id):
       # ユーザーの紹介人数を取得
       referral_count = get_referral_count(user_id)
       
       # 動的確率を計算
       probabilities = calculate_dynamic_probabilities(user_id, referral_count)
       
       # りんごを抽選
       apple_type = random.choices(
           list(probabilities.keys()),
           weights=list(probabilities.values())
       )[0]
       
       # りんごを作成
       apple = create_apple(user_id, apple_type)
       
       # りんご抽選権を減らす
       decrease_apple_draw_rights(user_id)
       
       return apple
   ```

2. **データベース**：
   ```sql
   INSERT INTO apples (
       user_id, 
       apple_type, 
       purchase_obligation, 
       purchase_available, 
       status, 
       reveal_at,
       created_at
   )
   VALUES (
       ?, 
       ?, 
       ?, 
       ?, 
       'pending', 
       NOW() + INTERVAL '24 hours',
       NOW()
   );
   
   UPDATE users
   SET apple_draw_rights = apple_draw_rights - 1
   WHERE id = ?;
   ```

**次のステップ**：
- りんご抽選完了 → ⑪24時間カウントダウンページへ

---

### ⑪24時間カウントダウン（徐々にりんごが見えてくる）

**ページ**：`/apple-reveal`

**内容**：
```
りんごを引きました！

結果は24時間後に発表されます。
お楽しみに♪

┌─────────────────────────────────┐
│                                 │
│      🍎 ???                     │  ← 最初はぼやけている
│                                 │
│   残り時間：23:45:32            │  ← カウントダウン
│                                 │
└─────────────────────────────────┘

【ホームに戻る】
```

**アニメーション**：
- 時間経過とともに、りんごが徐々に見えてくる
- 0時間：完全にぼやけている
- 6時間：少し見えてくる
- 12時間：半分見えてくる
- 18時間：ほぼ見えてくる
- 24時間：完全に見える

**実装**：
```javascript
// フロントエンド（Next.js）
const AppleReveal = ({ apple }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(apple.reveal_at));
  const [opacity, setOpacity] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      const left = calculateTimeLeft(apple.reveal_at);
      setTimeLeft(left);
      
      // 時間経過に応じて透明度を変更
      const progress = 1 - (left.total / (24 * 60 * 60 * 1000));
      setOpacity(progress);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [apple.reveal_at]);
  
  return (
    <div>
      <img 
        src={`/apples/${apple.apple_type}.png`} 
        style={{ opacity: opacity, filter: `blur(${(1 - opacity) * 20}px)` }}
      />
      <p>残り時間：{timeLeft.hours}:{timeLeft.minutes}:{timeLeft.seconds}</p>
    </div>
  );
};
```

**データベース**：
```sql
-- 24時間後にりんごの状態を更新
UPDATE apples
SET status = 'revealed'
WHERE reveal_at <= NOW() AND status = 'pending';
```

**次のステップ**：
- 24時間経過 → ⑫結果表示ページへ自動遷移

---

### ⑫結果表示と分岐

**ページ**：`/apple-result`

**内容**：

#### 毒りんごの場合

```
┌─────────────────────────────────┐
│                                 │
│      ☠️ 毒りんご                │
│                                 │
│  残念！毒りんごでした。         │
│                                 │
│  購入義務：1回                  │
│  購入してもらえる：0回          │
│                                 │
│  もう一度チャレンジしましょう！ │
│                                 │
│  【もう一度購入する】           │  ← ⑤へ
│                                 │
└─────────────────────────────────┘
```

#### ブロンズりんごの場合

```
┌─────────────────────────────────┐
│                                 │
│      🍎 ブロンズりんご           │
│                                 │
│  おめでとうございます！         │
│                                 │
│  購入義務：1回                  │
│  購入してもらえる：1回          │
│                                 │
│  【もう一度購入する】           │  ← ⑤へ
│                                 │
└─────────────────────────────────┘
```

#### シルバーりんごの場合

```
┌─────────────────────────────────┐
│                                 │
│      🍎✨ シルバーりんご         │
│                                 │
│  おめでとうございます！         │
│                                 │
│  購入義務：1回                  │
│  購入してもらえる：2回          │
│                                 │
│  あなたの欲しいものリストから、 │
│  2回購入してもらえます！        │
│                                 │
│  【チケットを確認】             │  ← マイページへ
│  【もう一度購入する】           │  ← ⑤へ
│                                 │
└─────────────────────────────────┘
```

#### ゴールドりんごの場合

```
┌─────────────────────────────────┐
│                                 │
│      🍎✨✨ ゴールドりんご       │
│                                 │
│  おめでとうございます！         │
│                                 │
│  購入義務：1回                  │
│  購入してもらえる：3回          │
│                                 │
│  あなたの欲しいものリストから、 │
│  3回購入してもらえます！        │
│                                 │
│  【チケットを確認】             │  ← マイページへ
│  【もう一度購入する】           │  ← ⑤へ
│                                 │
└─────────────────────────────────┘
```

#### 赤いりんごの場合

```
┌─────────────────────────────────┐
│                                 │
│      🍎🔥 赤いりんご             │
│                                 │
│  🎉 大当たり！！！              │
│                                 │
│  購入義務：1回                  │
│  購入してもらえる：10回         │
│                                 │
│  あなたの欲しいものリストから、 │
│  10回購入してもらえます！       │
│                                 │
│  【チケットを確認】             │  ← マイページへ
│  【もう一度購入する】           │  ← ⑤へ
│                                 │
└─────────────────────────────────┘
```

**データベース**：
```sql
-- りんごの状態を更新
UPDATE apples
SET status = 'completed'
WHERE id = ?;

-- ユーザーの購入義務と購入権を更新
UPDATE users
SET 
    purchase_obligation = purchase_obligation + ?,
    purchase_available = purchase_available + ?
WHERE id = ?;
```

**次のステップ**：
- 【もう一度購入する】 → ⑤購入ページへ
- 【チケットを確認】 → マイページへ

---

### ⑬友達紹介機能（初回ユーザーは⑥完了後に解放）

**ページ**：`/referral`

**制限**：
- 初回ユーザー（`status != 'first_purchase_completed'`）は、友達紹介機能を使用できない
- ⑥スクリーンショット提出が完了するまで、友達紹介ページはグレーアウト

**内容**：

#### 初回ユーザー（⑥未完了）の場合

```
┌─────────────────────────────────┐
│                                 │
│  友達紹介機能                   │
│                                 │
│  🔒 この機能はまだ使用できません│
│                                 │
│  初回の購入確認が完了すると、   │
│  友達紹介機能が使用できるように │
│  なります。                     │
│                                 │
│  【ホームに戻る】               │
│                                 │
└─────────────────────────────────┘
```

#### 初回ユーザー（⑥完了）の場合

```
┌─────────────────────────────────┐
│                                 │
│  友達紹介機能                   │
│                                 │
│  あなたの紹介コード：           │
│  ABC12XYZ                       │
│                                 │
│  【コピー】【QRコード表示】     │
│                                 │
│  友達がこのコードを使って       │
│  登録すると、あなたの紹介人数   │
│  が増えます！                   │
│                                 │
│  紹介人数：0人                  │
│  次のハードル：3人              │
│                                 │
└─────────────────────────────────┘
```

**データベース**：
```sql
-- 紹介コードを生成
UPDATE users
SET referral_code = GENERATE_REFERRAL_CODE()
WHERE id = ? AND referral_code IS NULL;

-- 紹介された場合
INSERT INTO referrals (referrer_id, referee_id, created_at)
VALUES (?, ?, NOW());

UPDATE users
SET referral_count = referral_count + 1
WHERE id = ?;
```

---

## エラー処理とグレーアウトの仕様

### 各ステップでのアクセス制限

| ステップ | 必要な条件 | 条件を満たさない場合の処理 |
|---------|-----------|------------------------|
| ③利用規約 | `status = 'registered'` | ②ログインページへリダイレクト |
| ④使い方 | `status = 'terms_agreed'` | ③利用規約ページへリダイレクト |
| ⑤購入 | `status = 'tutorial_completed'` | ④使い方ページへリダイレクト |
| ⑥スクリーンショット | `purchase.status = 'pending'` | ⑤購入ページへリダイレクト |
| ⑦判定 | `purchase.status = 'screenshot_uploaded'` | ⑥スクリーンショットページへリダイレクト |
| ⑧欲しいものリスト | `purchase.verification_status = 'APPROVED'` | ⑦判定待ちページへリダイレクト |
| ⑨りんごを引く | `status = 'first_purchase_completed'` | ⑧欲しいものリストページへリダイレクト |
| ⑩りんご抽選 | `apple_draw_rights > 0` | エラーメッセージ「りんご抽選権がありません」 |
| ⑬友達紹介 | `status = 'first_purchase_completed'` | グレーアウト + 「初回の購入確認が完了すると使用できます」 |

### グレーアウトの実装

```javascript
// フロントエンド（Next.js）
const ReferralButton = ({ user }) => {
  const isDisabled = user.status !== 'first_purchase_completed';
  
  return (
    <button
      disabled={isDisabled}
      className={`btn ${isDisabled ? 'btn-disabled' : 'btn-primary'}`}
      onClick={() => router.push('/referral')}
    >
      友達紹介
      {isDisabled && (
        <span className="tooltip">初回の購入確認が完了すると使用できます</span>
      )}
    </button>
  );
};
```

---

## ユーザー状態管理

### ユーザーの状態（status）

| 状態 | 説明 | 次のステップ |
|------|------|------------|
| `registered` | 登録完了 | ③利用規約 |
| `terms_agreed` | 利用規約同意 | ④使い方 |
| `tutorial_completed` | 使い方完了 | ⑤購入 |
| `first_purchase_completed` | 初回購入完了 | ⑨りんごを引く |
| `active` | アクティブユーザー | 通常利用 |

### データベーススキーマ（users テーブル）

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'registered',
    
    -- 各ステップの完了日時
    terms_agreed_at TIMESTAMP,
    tutorial_completed_at TIMESTAMP,
    wishlist_registered_at TIMESTAMP,
    
    -- 欲しいものリスト
    wishlist_url TEXT,
    wishlist_locked BOOLEAN DEFAULT FALSE,
    
    -- 紹介機能
    referral_code VARCHAR(20) UNIQUE,
    referred_by UUID REFERENCES users(id),
    referral_count INTEGER DEFAULT 0,
    
    -- りんご抽選権
    apple_draw_rights INTEGER DEFAULT 0,
    
    -- 購入義務と購入権
    purchase_obligation INTEGER DEFAULT 0,
    purchase_available INTEGER DEFAULT 0,
    
    -- シルバー・ゴールド追跡
    silver_gold_completed_count INTEGER DEFAULT 0,
    last_silver_gold_completed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## チケット消化システム

### マイページでのチケット表示

```
┌─────────────────────────────────┐
│                                 │
│  あなたのチケット               │
│                                 │
│  購入してもらえる回数：3回      │  ← purchase_available
│                                 │
│  【チケットを使用】             │
│                                 │
└─────────────────────────────────┘
```

### チケット使用の流れ

1. ユーザーが【チケットを使用】ボタンをクリック
2. 誰かがユーザーの欲しいものリストから商品を購入
3. 購入が確認されると、`purchase_available` が1減る
4. `purchase_available` が0になると、チケット完了

### データベース処理

```sql
-- チケット使用
UPDATE users
SET purchase_available = purchase_available - 1
WHERE id = ? AND purchase_available > 0;

-- チケット完了時（purchase_available = 0）
UPDATE users
SET 
    referral_count = 0,
    silver_gold_completed_count = silver_gold_completed_count + 1,
    last_silver_gold_completed_at = NOW()
WHERE id = ? AND purchase_available = 0;
```

---

## まとめ

このユーザーフローにより：

✅ **ユーザーが迷わない**：順番通りに進むしかない設計  
✅ **不正を防ぐ**：各ステップで厳密なチェック  
✅ **ドキドキ感**：24時間カウントダウン + 徐々に見えるりんご  
✅ **公平性**：初回ユーザーは友達紹介不可  
✅ **わかりやすい**：グレーアウト + エラーメッセージ

次は、**管理者パネルの仕様**をお待ちしています。
