# オリパシステム 動的RTP（Return To Player）システム設計

**概念**：固定確率ではなく、システムの状態に応じて確率を動的に調整

---

## 1. 動的RTPシステムの基本概念

### 従来の固定確率システムの問題

```
固定確率：
  ブロンズ: 55%
  シルバー: 20%
  ゴールド: 12%
  赤いりんご: 5%
  毒りんご: 8%

問題：
  - 全員が紹介3人以上になると、購入権が過剰になる
  - 新規ユーザーが増えると、購入義務が増えるが、確率は変わらない
  - システムの状態に対応できない
```

### 動的RTPシステムの概念

```
動的確率：
  - システムの状態をリアルタイムで監視
  - 購入義務と購入権のバランスを計算
  - 確率を動的に調整
  - 常に、購入義務 ≈ 購入権 を維持
```

---

## 2. 動的RTPシステムの仕組み

### ステップ1：システムの状態を監視

```
毎日（または毎時間）、以下の情報を集計：

1. ユーザー統計
   - 総ユーザー数
   - 新規ユーザー数（今月）
   - アクティブユーザー数

2. りんご統計
   - 各りんごの保有ユーザー数
   - 各りんごの購入義務残数
   - 各りんごの購入権残数

3. 購入統計
   - 月間購入義務合計
   - 月間購入権合計
   - 月間購入権消費数
   - 月間購入義務完了数

4. バランス指標
   - 購入権 / 購入義務 の比率
   - 毒りんごの確率
   - 新規ユーザーの参加速度
```

### ステップ2：RTP（Return To Player）を計算

```
RTP = 購入権の合計 / 購入義務の合計

例：
  購入義務合計：1000回
  購入権合計：1100回
  RTP = 1100 / 1000 = 1.10 (110%)

解釈：
  - RTP > 1.0：購入権が過剰（ユーザーが得をしている）
  - RTP = 1.0：バランスしている
  - RTP < 1.0：購入権が不足（ユーザーが損をしている）
```

### ステップ3：RTPに基づいて確率を調整

```
目標RTP：1.0（バランス）

現在RTP：1.10（購入権が10%過剰）

調整方法：
  - 毒りんごの確率を上げる
  - または、上位りんご（シルバー、ゴールド）の確率を下げる
  - または、赤いりんごの確率を下げる
```

---

## 3. 具体的な動的RTP計算アルゴリズム

### 基本的な計算式

```python
def calculate_dynamic_rtp():
    # 1. 現在のシステム状態を取得
    total_users = get_total_users()
    apples = get_all_apples()
    
    # 2. 各りんごの購入義務と購入権を計算
    total_purchase_obligation = 0
    total_purchase_right = 0
    
    for apple in apples:
        total_purchase_obligation += apple.count * apple.purchase_obligation
        total_purchase_right += apple.count * apple.purchase_right
    
    # 3. 新規ユーザーの購入義務を追加
    new_users_this_month = get_new_users_this_month()
    total_purchase_obligation += new_users_this_month * 1
    
    # 4. RTPを計算
    if total_purchase_obligation == 0:
        rtp = 1.0
    else:
        rtp = total_purchase_right / total_purchase_obligation
    
    return rtp

# 使用例
rtp = calculate_dynamic_rtp()
print(f"Current RTP: {rtp:.2%}")
```

### RTPに基づいた確率調整

```python
def adjust_probabilities_by_rtp(rtp):
    """
    RTPに基づいて、りんごの確率を動的に調整
    """
    
    # ベース確率（基本的な確率）
    base_probabilities = {
        'bronze': 0.60,
        'silver': 0.15,
        'gold': 0.08,
        'red': 0.02,
        'poison': 0.15
    }
    
    # RTPの目標値
    target_rtp = 1.0
    
    # RTPの偏差
    rtp_deviation = rtp - target_rtp
    
    # 調整係数
    if rtp_deviation > 0.05:  # RTPが5%以上高い
        # 購入権が過剰 → 毒りんごの確率を上げる
        poison_increase = rtp_deviation * 0.5
        base_probabilities['poison'] += poison_increase
        
        # 上位りんごの確率を下げる
        base_probabilities['silver'] -= poison_increase * 0.3
        base_probabilities['gold'] -= poison_increase * 0.2
        base_probabilities['red'] -= poison_increase * 0.1
    
    elif rtp_deviation < -0.05:  # RTPが5%以上低い
        # 購入権が不足 → 毒りんごの確率を下げる
        poison_decrease = abs(rtp_deviation) * 0.5
        base_probabilities['poison'] -= poison_decrease
        
        # 上位りんごの確率を上げる
        base_probabilities['silver'] += poison_decrease * 0.3
        base_probabilities['gold'] += poison_decrease * 0.2
        base_probabilities['red'] += poison_decrease * 0.1
    
    # 確率を正規化（合計が100%になるように）
    total = sum(base_probabilities.values())
    for key in base_probabilities:
        base_probabilities[key] /= total
    
    return base_probabilities
```

---

## 4. 毒りんごベースの動的調整

### ユーザーの提案：毒りんごを基準に調整

```
基本的な構造：
  1. ブロンズが多め（基本的なりんご）
  2. 毒りんごが多め（バランス調整用）
  3. 毒りんごの数に合わせて、シルバー・ゴールドを調整
  4. 赤いりんごは滅多に出ない
```

### 毒りんごベースの計算アルゴリズム

```python
def calculate_poison_based_probabilities(rtp, referral_count):
    """
    毒りんごをベースに、確率を動的に調整
    
    Args:
        rtp: 現在のRTP（購入権 / 購入義務）
        referral_count: ユーザーの紹介人数
    
    Returns:
        各りんごの確率
    """
    
    # ステップ1：ブロンズの確率を固定
    bronze_probability = 0.50  # 基本的に50%
    
    # ステップ2：毒りんごの確率をRTPに基づいて計算
    # RTPが高い（購入権が過剰）→ 毒りんごの確率を上げる
    # RTPが低い（購入権が不足）→ 毒りんごの確率を下げる
    
    base_poison_probability = 0.15  # ベース確率15%
    
    if rtp > 1.0:
        # 購入権が過剰 → 毒りんごを増やす
        poison_increase = (rtp - 1.0) * 0.20  # 最大20%増加
        poison_probability = min(base_poison_probability + poison_increase, 0.35)
    else:
        # 購入権が不足 → 毒りんごを減らす
        poison_decrease = (1.0 - rtp) * 0.10  # 最大10%減少
        poison_probability = max(base_poison_probability - poison_decrease, 0.05)
    
    # ステップ3：残りの確率（100% - ブロンズ - 毒りんご）を
    # シルバー、ゴールド、赤いりんごに配分
    
    remaining_probability = 1.0 - bronze_probability - poison_probability
    
    # 紹介人数に基づいて、上位りんごの確率を調整
    if referral_count == 0:
        silver_probability = remaining_probability * 0.50
        gold_probability = remaining_probability * 0.30
        red_probability = remaining_probability * 0.20
    
    elif referral_count == 1:
        silver_probability = remaining_probability * 0.45
        gold_probability = remaining_probability * 0.35
        red_probability = remaining_probability * 0.20
    
    elif referral_count == 2:
        silver_probability = remaining_probability * 0.40
        gold_probability = remaining_probability * 0.40
        red_probability = remaining_probability * 0.20
    
    else:  # referral_count >= 3
        silver_probability = remaining_probability * 0.35
        gold_probability = remaining_probability * 0.45
        red_probability = remaining_probability * 0.20
    
    return {
        'bronze': bronze_probability,
        'silver': silver_probability,
        'gold': gold_probability,
        'red': red_probability,
        'poison': poison_probability
    }
```

---

## 5. 新規ユーザー参加を考慮した動的RTP

### 問題の認識

```
従来の計算：
  RTP = 購入権 / 購入義務

問題：
  - 新規ユーザーが参加すると、購入義務が増える
  - しかし、購入権は増えない
  - RTPが低下する
  - 毒りんごの確率が上がる
  - 既存ユーザーが得をする
```

### 改善案：予測RTPの計算

```python
def calculate_predictive_rtp(rtp, new_users_this_month, total_users):
    """
    新規ユーザーの参加を考慮した、予測RTPを計算
    
    Args:
        rtp: 現在のRTP
        new_users_this_month: 今月の新規ユーザー数
        total_users: 総ユーザー数
    
    Returns:
        予測RTP
    """
    
    # ステップ1：新規ユーザーの成長率を計算
    growth_rate = new_users_this_month / total_users if total_users > 0 else 0
    
    # ステップ2：予測RTPを計算
    # 新規ユーザーが増えると、購入義務が増えるので、RTPが低下する
    # 低下率は、新規ユーザーの成長率に比例する
    
    predicted_rtp = rtp / (1.0 + growth_rate)
    
    return predicted_rtp

# 使用例
rtp = 1.10
new_users = 100
total_users = 1000
growth_rate = new_users / total_users  # 10%

predicted_rtp = calculate_predictive_rtp(rtp, new_users, total_users)
print(f"Current RTP: {rtp:.2%}")
print(f"Predicted RTP: {predicted_rtp:.2%}")
# 出力：
# Current RTP: 110%
# Predicted RTP: 100%
```

### 予測RTPに基づいた確率調整

```python
def adjust_probabilities_by_predictive_rtp(rtp, new_users, total_users):
    """
    予測RTPに基づいて、確率を調整
    """
    
    # 予測RTPを計算
    predicted_rtp = calculate_predictive_rtp(rtp, new_users, total_users)
    
    # 予測RTPに基づいて、確率を調整
    # 予測RTPが1.0に近づくように調整
    
    base_poison_probability = 0.15
    
    if predicted_rtp > 1.05:
        # 予測RTPが高い → 毒りんごを増やす
        poison_increase = (predicted_rtp - 1.0) * 0.20
        poison_probability = min(base_poison_probability + poison_increase, 0.35)
    
    elif predicted_rtp < 0.95:
        # 予測RTPが低い → 毒りんごを減らす
        poison_decrease = (1.0 - predicted_rtp) * 0.10
        poison_probability = max(base_poison_probability - poison_decrease, 0.05)
    
    else:
        # 予測RTPがバランスしている
        poison_probability = base_poison_probability
    
    return poison_probability
```

---

## 6. 実装例：完全な動的RTPシステム

### データベース設計の追加

```python
class SystemMetrics(Base):
    __tablename__ = "system_metrics"
    
    id = Column(Integer, primary_key=True)
    
    # 日時
    date = Column(Date)
    
    # ユーザー統計
    total_users = Column(Integer)
    new_users_this_month = Column(Integer)
    active_users = Column(Integer)
    
    # りんご統計
    total_purchase_obligation = Column(Integer)
    total_purchase_right = Column(Integer)
    
    # RTP
    current_rtp = Column(Float)
    predicted_rtp = Column(Float)
    
    # 確率
    bronze_probability = Column(Float)
    silver_probability = Column(Float)
    gold_probability = Column(Float)
    red_probability = Column(Float)
    poison_probability = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
```

### 日次RTP計算バッチ処理

```python
def calculate_daily_rtp_and_update_probabilities():
    """
    毎日実行：RTPを計算し、確率を更新
    """
    
    # ステップ1：システム統計を取得
    total_users = db.query(func.count(User.id)).scalar()
    new_users_this_month = db.query(func.count(User.id)).filter(
        User.created_at >= datetime.now().replace(day=1)
    ).scalar()
    
    # ステップ2：りんご統計を計算
    apples = db.query(Apple).all()
    total_purchase_obligation = sum(apple.purchase_obligation_remaining for apple in apples)
    total_purchase_right = sum(apple.purchase_available_remaining for apple in apples)
    
    # ステップ3：RTPを計算
    current_rtp = total_purchase_right / total_purchase_obligation if total_purchase_obligation > 0 else 1.0
    predicted_rtp = calculate_predictive_rtp(current_rtp, new_users_this_month, total_users)
    
    # ステップ4：確率を計算
    # 紹介人数ごとに異なる確率を計算
    probabilities_by_referral = {}
    for referral_count in range(4):
        probabilities = calculate_poison_based_probabilities(predicted_rtp, referral_count)
        probabilities_by_referral[referral_count] = probabilities
    
    # ステップ5：メトリクスをデータベースに保存
    metrics = SystemMetrics(
        date=datetime.now().date(),
        total_users=total_users,
        new_users_this_month=new_users_this_month,
        active_users=get_active_users_count(),
        total_purchase_obligation=total_purchase_obligation,
        total_purchase_right=total_purchase_right,
        current_rtp=current_rtp,
        predicted_rtp=predicted_rtp,
        bronze_probability=probabilities_by_referral[0]['bronze'],
        silver_probability=probabilities_by_referral[0]['silver'],
        gold_probability=probabilities_by_referral[0]['gold'],
        red_probability=probabilities_by_referral[0]['red'],
        poison_probability=probabilities_by_referral[0]['poison']
    )
    db.add(metrics)
    db.commit()
    
    return probabilities_by_referral
```

### りんご抽選時の確率取得

```python
def draw_apple(user_id):
    """
    ユーザーがりんごを引く際に、最新の動的確率を使用
    """
    
    # ステップ1：ユーザー情報を取得
    user = db.query(User).filter(User.id == user_id).first()
    
    # ステップ2：最新のメトリクスを取得
    latest_metrics = db.query(SystemMetrics).order_by(
        SystemMetrics.date.desc()
    ).first()
    
    # ステップ3：ユーザーの紹介人数に基づいて、確率を計算
    if latest_metrics:
        # メトリクスから確率を取得（簡略版）
        # 実際には、紹介人数ごとに異なる確率を取得
        probabilities = {
            'bronze': latest_metrics.bronze_probability,
            'silver': latest_metrics.silver_probability,
            'gold': latest_metrics.gold_probability,
            'red': latest_metrics.red_probability,
            'poison': latest_metrics.poison_probability
        }
    else:
        # デフォルト確率
        probabilities = {
            'bronze': 0.50,
            'silver': 0.15,
            'gold': 0.08,
            'red': 0.02,
            'poison': 0.25
        }
    
    # ステップ4：確率に基づいてりんごを抽選
    apple_type = random.choices(
        list(probabilities.keys()),
        weights=list(probabilities.values())
    )[0]
    
    # ステップ5：りんごを作成
    apple = Apple(
        user_id=user_id,
        apple_type=apple_type,
        purchase_obligation=get_purchase_obligation(apple_type),
        purchase_available=get_purchase_available(apple_type),
        purchase_obligation_remaining=get_purchase_obligation(apple_type),
        purchase_available_remaining=get_purchase_available(apple_type)
    )
    db.add(apple)
    
    # ステップ6：りんご抽選権を減らす
    user.apple_draw_rights -= 1
    
    # ステップ7：紹介カウントをリセット（上位りんごを引いた場合）
    if apple_type in ['red', 'gold']:
        user.referral_count = 0
    
    db.commit()
    
    return apple
```

---

## 7. 動的RTPシステムの利点

### 利点1：整合性の自動維持

```
固定確率：
  - 手動で確率を調整する必要がある
  - 調整が遅れると、システムが破綻する

動的RTP：
  - 自動的に確率を調整
  - 常に、購入義務 ≈ 購入権 を維持
  - システムが破綻しない
```

### 利点2：新規ユーザーの参加を自動的に考慮

```
固定確率：
  - 新規ユーザーが増えると、購入義務が増える
  - 既存ユーザーが得をする
  - 不公平

動的RTP：
  - 新規ユーザーの参加を予測
  - 確率を自動的に調整
  - 公平性を保つ
```

### 利点3：ゲーム性の向上

```
固定確率：
  - 確率が変わらないので、単調
  - ユーザーが飽きやすい

動的RTP：
  - 確率が変わるので、ゲーム性が高い
  - ユーザーが飽きにくい
  - システムの状態に応じて、戦略が変わる
```

---

## 8. 動的RTPシステムの注意点

### 注意点1：確率の急激な変動を避ける

```python
def smooth_probability_adjustment(old_probability, new_probability, smoothing_factor=0.1):
    """
    確率の変動を平滑化
    
    Args:
        old_probability: 前日の確率
        new_probability: 計算された新しい確率
        smoothing_factor: 平滑化係数（0～1）
    
    Returns:
        平滑化された確率
    """
    
    # 前日の確率と新しい確率の加重平均
    smoothed = old_probability * (1 - smoothing_factor) + new_probability * smoothing_factor
    
    return smoothed
```

### 注意点2：確率の下限と上限を設定

```python
def clamp_probability(probability, min_prob=0.01, max_prob=0.50):
    """
    確率を下限と上限の範囲内に制限
    """
    return max(min_prob, min(max_prob, probability))
```

### 注意点3：ユーザーへの透明性

```
ユーザーに対して、以下の情報を公開：
  - 現在のRTP
  - 各りんごの確率
  - 確率の更新日時
  - 確率が変わる理由

例：
  「現在のRTP：105%」
  「ブロンズ：50%、シルバー：15%、ゴールド：8%、赤いりんご：2%、毒りんご：25%」
  「毒りんごの確率が高いのは、購入権が過剰だからです。」
```

---

## 9. 実装スケジュール

### フェーズ1：基本的な動的RTPシステム（1～2週間）

```
1. SystemMetricsテーブルの作成
2. 日次RTP計算バッチ処理の実装
3. 確率計算アルゴリズムの実装
4. りんご抽選時の確率取得の実装
```

### フェーズ2：新規ユーザー参加を考慮した予測RTP（1週間）

```
1. 予測RTP計算アルゴリズムの実装
2. 成長率の計算
3. 予測RTPに基づいた確率調整
```

### フェーズ3：確率の平滑化と最適化（1週間）

```
1. 確率の平滑化アルゴリズムの実装
2. 下限と上限の設定
3. ユーザーへの透明性向上
```

### フェーズ4：監視とチューニング（継続）

```
1. RTPの監視
2. 確率の調整
3. ユーザーフィードバックの収集
4. アルゴリズムの最適化
```

---

## 10. 動的RTPシステムの例

### シナリオ1：初期段階（新規ユーザーが多い）

```
日付：2025年1月1日
総ユーザー数：100人
新規ユーザー数（今月）：100人
成長率：100%

購入義務合計：100回（各ユーザー1回）
購入権合計：150回（平均1.5回）

現在RTP：150 / 100 = 1.50 (150%)
予測RTP：1.50 / (1 + 1.0) = 0.75 (75%)

確率調整：
  - 予測RTPが低い（75%）→ 毒りんごを減らす
  - 上位りんごの確率を上げる
  
確率：
  ブロンズ：50%
  シルバー：20%
  ゴールド：12%
  赤いりんご：5%
  毒りんご：13%
```

### シナリオ2：成長期（新規ユーザーが減少）

```
日付：2025年2月1日
総ユーザー数：500人
新規ユーザー数（今月）：50人
成長率：10%

購入義務合計：500回
購入権合計：600回（平均1.2回）

現在RTP：600 / 500 = 1.20 (120%)
予測RTP：1.20 / (1 + 0.1) = 1.09 (109%)

確率調整：
  - 予測RTPが高い（109%）→ 毒りんごを増やす
  
確率：
  ブロンズ：50%
  シルバー：15%
  ゴールド：10%
  赤いりんご：3%
  毒りんご：22%
```

### シナリオ3：成熟期（新規ユーザーが安定）

```
日付：2025年3月1日
総ユーザー数：1000人
新規ユーザー数（今月）：50人
成長率：5%

購入義務合計：1000回
購入権合計：1050回（平均1.05回）

現在RTP：1050 / 1000 = 1.05 (105%)
予測RTP：1.05 / (1 + 0.05) = 1.00 (100%)

確率調整：
  - 予測RTPがバランス（100%）→ 毒りんごは基本確率
  
確率：
  ブロンズ：50%
  シルバー：16%
  ゴールド：11%
  赤いりんご：3%
  毒りんご：20%
```

---

## 11. 最終的な確率テーブル（動的RTPベース）

### 基本的な確率構造

```
ブロンズ：50%（固定）
毒りんご：10～30%（RTPに基づいて動的調整）
シルバー：10～20%（残りの確率から配分）
ゴールド：5～15%（残りの確率から配分）
赤いりんご：1～5%（残りの確率から配分）
```

### 紹介人数による調整

```
紹介人数0人：
  シルバー：50%（残りの確率）
  ゴールド：30%（残りの確率）
  赤いりんご：20%（残りの確率）

紹介人数1人：
  シルバー：45%（残りの確率）
  ゴールド：35%（残りの確率）
  赤いりんご：20%（残りの確率）

紹介人数2人：
  シルバー：40%（残りの確率）
  ゴールド：40%（残りの確率）
  赤いりんご：20%（残りの確率）

紹介人数3人以上：
  シルバー：35%（残りの確率）
  ゴールド：45%（残りの確率）
  赤いりんご：20%（残りの確率）
```

---

**次のステップ**：
1. この動的RTPシステムの設計に同意できますか？
2. 実装方法について、質問や提案はありますか？
3. 開発を開始してもよろしいですか？
