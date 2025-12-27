# 動的RTPシステム改善案
## 初期段階対策と友達紹介精度の厳格化

---

## 1. 初期段階のRTP問題

### 問題の認識

```
リリース初期段階：
  - ユーザー数が少ない（例：10人）
  - りんご統計が不安定
  - RTPが大きく変動する
  - 確率がおかしくなる

例：
  日1：ユーザー10人、購入権150回、購入義務100回 → RTP 150%
  日2：ユーザー5人がりんご消費 → 購入権140回、購入義務100回 → RTP 140%
  日3：新規ユーザー20人参加 → 購入権140回、購入義務120回 → RTP 117%
  
  確率が毎日大きく変動して、ユーザーが混乱する
```

### 原因

1. **ユーザー数が少ない**：統計的なばらつきが大きい
2. **初期りんご配分が不安定**：新規ユーザーがすぐにりんごを引く
3. **購入権消費が予測不可能**：少数のユーザーの行動で大きく変動

---

## 2. 初期段階RTP対策：ブートストラップ期間の設定

### 案1：固定確率期間の設定

```python
def get_probabilities(user_id, days_since_launch):
    """
    リリース後の経過日数に基づいて、確率を決定
    """
    
    # ブートストラップ期間：リリース後30日間
    BOOTSTRAP_PERIOD = 30
    
    if days_since_launch < BOOTSTRAP_PERIOD:
        # ブートストラップ期間中は、固定確率を使用
        return get_fixed_probabilities(user_id)
    else:
        # ブートストラップ期間後は、動的RTPを使用
        return get_dynamic_rtp_probabilities(user_id)

def get_fixed_probabilities(user_id):
    """
    ブートストラップ期間中の固定確率
    """
    
    user = get_user(user_id)
    referral_count = user.referral_count
    
    if referral_count == 0:
        return {
            'bronze': 0.55,
            'silver': 0.20,
            'gold': 0.12,
            'red': 0.03,
            'poison': 0.10
        }
    elif referral_count == 1:
        return {
            'bronze': 0.52,
            'silver': 0.22,
            'gold': 0.14,
            'red': 0.04,
            'poison': 0.08
        }
    elif referral_count == 2:
        return {
            'bronze': 0.49,
            'silver': 0.24,
            'gold': 0.16,
            'red': 0.05,
            'poison': 0.06
        }
    else:  # referral_count >= 3
        return {
            'bronze': 0.46,
            'silver': 0.26,
            'gold': 0.18,
            'red': 0.06,
            'poison': 0.04
        }
```

### 案2：段階的な確率調整

```python
def get_probabilities_with_bootstrap(user_id, days_since_launch):
    """
    ブートストラップ期間中は、固定確率から動的RTPへ段階的に移行
    """
    
    BOOTSTRAP_PERIOD = 30
    
    if days_since_launch < BOOTSTRAP_PERIOD:
        # 移行係数を計算（0～1）
        transition_factor = days_since_launch / BOOTSTRAP_PERIOD
        
        # 固定確率と動的確率を加重平均
        fixed_probs = get_fixed_probabilities(user_id)
        dynamic_probs = get_dynamic_rtp_probabilities(user_id)
        
        blended_probs = {}
        for apple_type in fixed_probs.keys():
            blended_probs[apple_type] = (
                fixed_probs[apple_type] * (1 - transition_factor) +
                dynamic_probs[apple_type] * transition_factor
            )
        
        return blended_probs
    else:
        return get_dynamic_rtp_probabilities(user_id)
```

### 案3：最小ユーザー数の設定

```python
def get_probabilities_with_minimum_users(user_id):
    """
    最小ユーザー数に達するまで、固定確率を使用
    """
    
    MINIMUM_USERS_FOR_DYNAMIC_RTP = 100
    
    total_users = get_total_users()
    
    if total_users < MINIMUM_USERS_FOR_DYNAMIC_RTP:
        # ユーザー数が少ない → 固定確率
        return get_fixed_probabilities(user_id)
    else:
        # ユーザー数が十分 → 動的RTP
        return get_dynamic_rtp_probabilities(user_id)
```

### 推奨案：複合的なアプローチ

```python
def get_probabilities_robust(user_id):
    """
    複数の条件を組み合わせて、確率を決定
    """
    
    BOOTSTRAP_PERIOD = 30
    MINIMUM_USERS = 100
    
    days_since_launch = get_days_since_launch()
    total_users = get_total_users()
    
    # 条件1：ブートストラップ期間中
    if days_since_launch < BOOTSTRAP_PERIOD:
        return get_fixed_probabilities(user_id)
    
    # 条件2：ユーザー数が少ない
    if total_users < MINIMUM_USERS:
        return get_fixed_probabilities(user_id)
    
    # 条件3：動的RTPの統計が不安定
    rtp_variance = calculate_rtp_variance()
    if rtp_variance > 0.20:  # RTPの変動が20%以上
        return get_fixed_probabilities(user_id)
    
    # 全ての条件をクリア → 動的RTP
    return get_dynamic_rtp_probabilities(user_id)
```

---

## 3. 友達紹介精度の厳格化

### 現在の問題

```
現在の設計：
  紹介人数0人：ブロンズ55%, シルバー20%, ゴールド12%, 赤3%, 毒10%
  紹介人数1人：ブロンズ52%, シルバー22%, ゴールド14%, 赤4%, 毒8%
  紹介人数2人：ブロンズ49%, シルバー24%, ゴールド16%, 赤5%, 毒6%
  紹介人数3人以上：ブロンズ46%, シルバー26%, ゴールド18%, 赤6%, 毒4%

問題：
  - SNSで簡単に3人紹介できる
  - 3人紹介すれば、すぐに高確率でシルバー・ゴールドが出る
  - ゲームのバランスが崩れる
```

### 改善案1：紹介人数のハードルを上げる

```python
def get_probabilities_strict_referral(user_id):
    """
    紹介人数のハードルを大幅に上げた確率
    """
    
    user = get_user(user_id)
    referral_count = user.referral_count
    
    if referral_count == 0:
        return {
            'bronze': 0.60,
            'silver': 0.18,
            'gold': 0.10,
            'red': 0.02,
            'poison': 0.10
        }
    elif referral_count <= 3:
        return {
            'bronze': 0.58,
            'silver': 0.18,
            'gold': 0.10,
            'red': 0.02,
            'poison': 0.12
        }
    elif referral_count <= 5:
        return {
            'bronze': 0.56,
            'silver': 0.19,
            'gold': 0.11,
            'red': 0.03,
            'poison': 0.11
        }
    elif referral_count <= 10:
        return {
            'bronze': 0.50,
            'silver': 0.22,
            'gold': 0.14,
            'red': 0.04,
            'poison': 0.10
        }
    elif referral_count <= 20:
        return {
            'bronze': 0.45,
            'silver': 0.25,
            'gold': 0.17,
            'red': 0.05,
            'poison': 0.08
        }
    else:  # referral_count > 20
        return {
            'bronze': 0.40,
            'silver': 0.28,
            'gold': 0.20,
            'red': 0.07,
            'poison': 0.05
        }
```

### 改善案2：動的紹介ハードルの設定

```python
def calculate_dynamic_referral_threshold(user_id):
    """
    ユーザーが同じ人に複数回シルバー・ゴールドを引くのを防ぐため、
    紹介ハードルを動的に上げる
    """
    
    user = get_user(user_id)
    
    # ユーザーが引いたシルバー・ゴールドの回数
    silver_gold_count = db.query(Apple).filter(
        Apple.user_id == user_id,
        Apple.apple_type.in_(['silver', 'gold'])
    ).count()
    
    # 基本的な紹介ハードル
    base_threshold = 3
    
    # 1回シルバー・ゴールドを引くたびに、ハードルを1上げる
    dynamic_threshold = base_threshold + silver_gold_count
    
    return dynamic_threshold

def get_probabilities_with_dynamic_threshold(user_id):
    """
    動的紹介ハードルに基づいて、確率を決定
    """
    
    user = get_user(user_id)
    referral_count = user.referral_count
    dynamic_threshold = calculate_dynamic_referral_threshold(user_id)
    
    # 紹介人数が動的ハードルに達しているか確認
    if referral_count < dynamic_threshold:
        # ハードルに達していない → 基本確率
        return {
            'bronze': 0.60,
            'silver': 0.18,
            'gold': 0.10,
            'red': 0.02,
            'poison': 0.10
        }
    else:
        # ハードルに達している → 上位りんごの確率を上げる
        # ハードルを超えた人数に応じて、確率を調整
        excess_referrals = referral_count - dynamic_threshold
        
        if excess_referrals < 5:
            return {
                'bronze': 0.55,
                'silver': 0.20,
                'gold': 0.12,
                'red': 0.03,
                'poison': 0.10
            }
        elif excess_referrals < 10:
            return {
                'bronze': 0.50,
                'silver': 0.22,
                'gold': 0.14,
                'red': 0.04,
                'poison': 0.10
            }
        else:
            return {
                'bronze': 0.45,
                'silver': 0.25,
                'gold': 0.17,
                'red': 0.05,
                'poison': 0.08
            }
```

---

## 4. シルバー・ゴールド完了後の振り出しに戻す仕組み

### 現在の問題

```
現在の設計：
  - ユーザーがシルバーを引く → 購入権2回
  - 2回購入してもらう → シルバー完了
  - その後、新しいりんごを引く

問題：
  - シルバー・ゴールドを引いた人が、すぐに新しいりんごを引く
  - 紹介カウントがリセットされない
  - 同じ人に何度もシルバー・ゴールドが当たりやすい
```

### 改善案：シルバー・ゴールド完了時に紹介カウントをリセット

```python
def complete_apple(apple_id):
    """
    ユーザーがりんごの購入権を全て消費した時点で、
    紹介カウントをリセット
    """
    
    apple = db.query(Apple).filter(Apple.id == apple_id).first()
    
    # 購入権が全て消費されたか確認
    if apple.purchase_available_remaining == 0:
        # りんごを完了状態に
        apple.completed_at = datetime.utcnow()
        
        # ユーザーの紹介カウントをリセット
        user = db.query(User).filter(User.id == apple.user_id).first()
        user.referral_count = 0
        
        # ユーザーの「シルバー・ゴールド完了回数」を記録
        user.silver_gold_completed_count += 1
        
        db.commit()
        
        return True
    
    return False
```

### データベーススキーマの追加

```python
class User(Base):
    __tablename__ = "users"
    
    # ... 既存フィールド ...
    
    # シルバー・ゴールド完了回数
    silver_gold_completed_count = Column(Integer, default=0)
    
    # 最後にシルバー・ゴールドを完了した日時
    last_silver_gold_completed_at = Column(DateTime, nullable=True)
```

---

## 5. 同じ人に複数回シルバー・ゴールドが当たるのを防ぐ仕組み

### 問題の認識

```
問題：
  - ユーザーAが何度もシルバー・ゴールドを引く
  - 他のユーザーは、ほとんどシルバー・ゴールドを引けない
  - 不公平

原因：
  - 紹介人数が多いユーザーは、確率が高い
  - 確率が高いユーザーほど、何度も引く機会がある
```

### 改善案1：「最後にシルバー・ゴールドを引いてからの経過日数」に基づいた確率調整

```python
def calculate_days_since_last_silver_gold(user_id):
    """
    最後にシルバー・ゴールドを引いてからの経過日数を計算
    """
    
    user = get_user(user_id)
    
    if user.last_silver_gold_completed_at is None:
        # シルバー・ゴールドを引いたことがない
        return float('inf')
    
    days_since = (datetime.utcnow() - user.last_silver_gold_completed_at).days
    
    return days_since

def adjust_probability_by_last_silver_gold(probabilities, user_id):
    """
    最後にシルバー・ゴールドを引いてからの経過日数に基づいて、
    確率を調整
    """
    
    days_since = calculate_days_since_last_silver_gold(user_id)
    
    if days_since < 7:
        # 1週間以内にシルバー・ゴールドを引いた
        # → シルバー・ゴールドの確率を大幅に下げる
        probabilities['silver'] *= 0.3
        probabilities['gold'] *= 0.3
        probabilities['red'] *= 0.3
        
        # 毒りんごの確率を上げる
        probabilities['poison'] += 0.3
    
    elif days_since < 14:
        # 2週間以内にシルバー・ゴールドを引いた
        # → シルバー・ゴールドの確率を下げる
        probabilities['silver'] *= 0.5
        probabilities['gold'] *= 0.5
        probabilities['red'] *= 0.5
        
        # 毒りんごの確率を上げる
        probabilities['poison'] += 0.2
    
    elif days_since < 30:
        # 1ヶ月以内にシルバー・ゴールドを引いた
        # → シルバー・ゴールドの確率を少し下げる
        probabilities['silver'] *= 0.8
        probabilities['gold'] *= 0.8
        probabilities['red'] *= 0.8
        
        # 毒りんごの確率を少し上げる
        probabilities['poison'] += 0.1
    
    # 確率を正規化
    total = sum(probabilities.values())
    for key in probabilities:
        probabilities[key] /= total
    
    return probabilities
```

### 改善案2：「シルバー・ゴールド完了回数」に基づいた確率調整

```python
def adjust_probability_by_completion_count(probabilities, user_id):
    """
    シルバー・ゴールド完了回数に基づいて、確率を調整
    """
    
    user = get_user(user_id)
    completion_count = user.silver_gold_completed_count
    
    if completion_count == 0:
        # 初めてシルバー・ゴールドを目指す
        pass  # 確率を変更しない
    
    elif completion_count == 1:
        # 1回シルバー・ゴールドを完了
        # → 次のシルバー・ゴールドの確率を下げる
        probabilities['silver'] *= 0.7
        probabilities['gold'] *= 0.7
        probabilities['red'] *= 0.7
        probabilities['poison'] += 0.15
    
    elif completion_count == 2:
        # 2回シルバー・ゴールドを完了
        probabilities['silver'] *= 0.5
        probabilities['gold'] *= 0.5
        probabilities['red'] *= 0.5
        probabilities['poison'] += 0.25
    
    elif completion_count >= 3:
        # 3回以上シルバー・ゴールドを完了
        probabilities['silver'] *= 0.3
        probabilities['gold'] *= 0.3
        probabilities['red'] *= 0.3
        probabilities['poison'] += 0.35
    
    # 確率を正規化
    total = sum(probabilities.values())
    for key in probabilities:
        probabilities[key] /= total
    
    return probabilities
```

### 改善案3：複合的なアプローチ

```python
def get_final_probabilities(user_id):
    """
    複数の要因を組み合わせて、最終的な確率を決定
    """
    
    # ステップ1：基本確率を取得
    probabilities = get_base_probabilities(user_id)
    
    # ステップ2：動的RTPに基づいて調整
    probabilities = adjust_by_dynamic_rtp(probabilities)
    
    # ステップ3：紹介人数に基づいて調整
    probabilities = adjust_by_referral_count(probabilities, user_id)
    
    # ステップ4：最後にシルバー・ゴールドを引いてからの経過日数に基づいて調整
    probabilities = adjust_probability_by_last_silver_gold(probabilities, user_id)
    
    # ステップ5：シルバー・ゴールド完了回数に基づいて調整
    probabilities = adjust_probability_by_completion_count(probabilities, user_id)
    
    # ステップ6：確率を正規化
    total = sum(probabilities.values())
    for key in probabilities:
        probabilities[key] /= total
    
    return probabilities
```

---

## 6. 実装例：完全な改善版システム

### ユーザーモデルの拡張

```python
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)
    password_hash = Column(String)
    
    # 欲しいものリスト
    wishlist_url = Column(String)
    wishlist_locked = Column(Boolean, default=False)
    
    # 紹介機能
    referral_code = Column(String, unique=True)
    referred_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    referral_count = Column(Integer, default=0)
    
    # シルバー・ゴールド追跡
    silver_gold_completed_count = Column(Integer, default=0)
    last_silver_gold_completed_at = Column(DateTime, nullable=True)
    
    # その他
    apple_draw_rights = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### りんご抽選の完全な実装

```python
def draw_apple(user_id):
    """
    ユーザーがりんごを引く際の完全な処理
    """
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if user.apple_draw_rights <= 0:
        raise Exception("No apple draw rights")
    
    # ステップ1：最終確率を計算
    probabilities = get_final_probabilities(user_id)
    
    # ステップ2：確率に基づいてりんごを抽選
    apple_type = random.choices(
        list(probabilities.keys()),
        weights=list(probabilities.values())
    )[0]
    
    # ステップ3：りんごを作成
    apple = Apple(
        user_id=user_id,
        apple_type=apple_type,
        purchase_obligation=get_purchase_obligation(apple_type),
        purchase_available=get_purchase_available(apple_type),
        purchase_obligation_remaining=get_purchase_obligation(apple_type),
        purchase_available_remaining=get_purchase_available(apple_type)
    )
    db.add(apple)
    
    # ステップ4：りんご抽選権を減らす
    user.apple_draw_rights -= 1
    
    # ステップ5：紹介カウントをリセット（上位りんごを引いた場合）
    if apple_type in ['red', 'gold']:
        user.referral_count = 0
    
    db.commit()
    
    return apple

def record_purchase(apple_id):
    """
    ユーザーが購入してもらった時の処理
    """
    
    apple = db.query(Apple).filter(Apple.id == apple_id).first()
    
    # 購入権を減らす
    apple.purchase_available_remaining -= 1
    
    # 購入権が全て消費されたか確認
    if apple.purchase_available_remaining == 0:
        # りんごを完了状態に
        apple.completed_at = datetime.utcnow()
        
        # ユーザーの情報を更新
        user = db.query(User).filter(User.id == apple.user_id).first()
        user.referral_count = 0
        user.silver_gold_completed_count += 1
        user.last_silver_gold_completed_at = datetime.utcnow()
    
    db.commit()
```

---

## 7. 改善案の比較

### 初期段階RTP対策

| 案 | 実装難易度 | 効果 | 推奨度 |
|----|----------|------|--------|
| 固定確率期間 | 低 | 中 | ⭐⭐⭐ |
| 段階的移行 | 中 | 高 | ⭐⭐⭐⭐ |
| 最小ユーザー数 | 低 | 中 | ⭐⭐⭐ |
| 複合的アプローチ | 高 | 高 | ⭐⭐⭐⭐⭐ |

### 友達紹介精度の厳格化

| 案 | 実装難易度 | 効果 | 推奨度 |
|----|----------|------|--------|
| ハードル上昇 | 低 | 中 | ⭐⭐⭐ |
| 動的ハードル | 中 | 高 | ⭐⭐⭐⭐ |
| 経過日数ベース | 中 | 高 | ⭐⭐⭐⭐ |
| 完了回数ベース | 低 | 中 | ⭐⭐⭐ |
| 複合的アプローチ | 高 | 高 | ⭐⭐⭐⭐⭐ |

---

## 8. 最終推奨設計

### 初期段階RTP対策

**複合的アプローチ**：
1. ブートストラップ期間（30日）中は固定確率
2. ユーザー数100人未満は固定確率
3. RTP変動が20%以上は固定確率
4. 全ての条件をクリア後、動的RTPに移行

### 友達紹介精度の厳格化

**複合的アプローチ**：
1. 紹介人数のハードルを段階的に上げる（3人 → 5人 → 10人 → 20人）
2. 最後にシルバー・ゴールドを引いてからの経過日数に基づいて確率を調整
3. シルバー・ゴールド完了回数に基づいて確率を調整
4. 完了時に紹介カウントをリセット

---

## 9. ユーザーへの透明性

### ユーザーに表示する情報

```
【あなたの現在の状態】

紹介人数：5人
シルバー・ゴールド完了回数：2回
最後にシルバー・ゴールドを完了した日：2025年1月10日（5日前）

【現在のりんご確率】
ブロンズ：45%
シルバー：15%（通常20%から25%低下）
ゴールド：8%（通常14%から43%低下）
赤いりんご：2%（通常4%から50%低下）
毒りんご：30%（通常10%から200%上昇）

【確率が変わった理由】
- 最後にシルバー・ゴールドを完了してから5日しか経っていないため、
  シルバー・ゴールドの確率が低下しています。
- シルバー・ゴールド完了回数が2回のため、
  毒りんごの確率が上昇しています。
- 紹介人数が5人のため、基本確率よりも上位りんごの確率が高くなっています。

【次のステップ】
- 紹介人数を10人に増やすと、さらに上位りんごの確率が上昇します。
- 7日以上経つと、シルバー・ゴールドの確率が回復します。
```

---

## 10. 実装スケジュール

### フェーズ1：初期段階RTP対策（1週間）

```
1. ブートストラップ期間の設定
2. 固定確率の実装
3. 段階的移行ロジックの実装
4. テスト
```

### フェーズ2：友達紹介精度の厳格化（1～2週間）

```
1. 紹介ハードルの段階的上昇の実装
2. 経過日数ベースの確率調整の実装
3. 完了回数ベースの確率調整の実装
4. 紹介カウントリセットロジックの実装
5. テスト
```

### フェーズ3：ユーザーへの透明性向上（1週間）

```
1. ユーザーダッシュボードの実装
2. 確率計算の詳細表示
3. 確率が変わった理由の説明
4. テスト
```

---

**次のステップ**：
1. この改善案に同意できますか？
2. 調整が必要な部分はありますか？
3. 開発を開始してもよろしいですか？
