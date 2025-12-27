# りんご会♪ イラスト・アイコン使用ガイド

このディレクトリには、「りんご会♪」Webアプリケーションで使用するすべてのイラストとアイコンが含まれています。

---

## ディレクトリ構成

```
ringo_kai_assets/
├── cards/              # 完成版りんごカード（5枚）
├── reveal_stages/      # 段階的公開アニメーション用イラスト（8枚）
├── icons/              # チャットボットアイコン（2枚）
├── character/          # TOPページキャラクター（1枚）
└── ASSETS_GUIDE.md     # このファイル
```

---

## 1. 完成版りんごカード（cards/）

### 使用場所
- りんごを引くページ（24時間経過後、100%完了時）
- マイページ（りんご抽選履歴）
- 管理者パネル（りんご抽選履歴）

### ファイル一覧

| ファイル名 | 説明 | 使用タイミング |
|-----------|------|--------------|
| `bronze_apple_card_v2.png` | ブロンズりんごカード | 購入免除1回 |
| `silver_apple_card_final.png` | シルバーりんごカード | 購入免除2回 |
| `gold_apple_card_v2.png` | ゴールドりんごカード | 購入免除3回 |
| `red_apple_card_premium.png` | 赤いりんごカード（ULTRA RARE） | 購入免除10回 |
| `poison_apple_card_final.png` | 毒りんごカード（ハズレ） | 購入免除0回 |

### 実装例（Next.js）

```javascript
// pages/apple-draw.js
import Image from 'next/image';

const AppleCard = ({ appleType }) => {
  const cardImages = {
    bronze: '/images/cards/bronze_apple_card_v2.png',
    silver: '/images/cards/silver_apple_card_final.png',
    gold: '/images/cards/gold_apple_card_v2.png',
    red: '/images/cards/red_apple_card_premium.png',
    poison: '/images/cards/poison_apple_card_final.png'
  };

  return (
    <div className="apple-card">
      <Image
        src={cardImages[appleType]}
        alt={`${appleType}りんごカード`}
        width={600}
        height={840}
        priority
      />
    </div>
  );
};
```

---

## 2. 段階的公開アニメーション用イラスト（reveal_stages/）

### 使用場所
- りんごを引くページ（24時間のカウントダウン中）

### 段階の説明

| 段階 | 時間 | 進捗 | ファイル名 | 説明 |
|-----|------|------|-----------|------|
| 1 | 0～6時間 | 25% | `reveal_stage1_common.png` | 小さいグレーのりんご、強いぼかし |
| 2 | 6～12時間 | 50% | `reveal_stage2_clean.png` | カードの外枠が見えてくる |
| 3 | 12～18時間 | 75% | `reveal_stage3_clean.png` | フルサイズのグレーカード |
| 4 | 18～24時間 | 90% | `{apple}_stage4_clean.png` | 色が見えてくる（りんご別） |
| 5 | 24時間経過 | 100% | `cards/{apple}_apple_card_*.png` | 完全に明らかになる |

### 段階4のファイル一覧

| ファイル名 | 対応するりんご |
|-----------|--------------|
| `bronze_stage4_clean.png` | ブロンズりんご |
| `silver_stage4_clean.png` | シルバーりんご |
| `gold_stage4_clean.png` | ゴールドりんご |
| `red_stage4_clean.png` | 赤いりんご |
| `poison_stage4_clean.png` | 毒りんご |

### 実装例（Next.js）

```javascript
// components/AppleReveal.js
import { useState, useEffect } from 'react';
import Image from 'next/image';

const AppleReveal = ({ drawTime, appleType }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - drawTime) / 1000; // 秒
      const totalTime = 24 * 60 * 60; // 24時間（秒）
      const currentProgress = Math.min((elapsed / totalTime) * 100, 100);
      setProgress(currentProgress);
    }, 1000);

    return () => clearInterval(interval);
  }, [drawTime]);

  const getRevealImage = () => {
    if (progress < 25) {
      return '/images/reveal_stages/reveal_stage1_common.png';
    } else if (progress < 50) {
      return '/images/reveal_stages/reveal_stage2_clean.png';
    } else if (progress < 75) {
      return '/images/reveal_stages/reveal_stage3_clean.png';
    } else if (progress < 100) {
      return `/images/reveal_stages/${appleType}_stage4_clean.png`;
    } else {
      // 段階5：完成版カード
      const finalCards = {
        bronze: '/images/cards/bronze_apple_card_v2.png',
        silver: '/images/cards/silver_apple_card_final.png',
        gold: '/images/cards/gold_apple_card_v2.png',
        red: '/images/cards/red_apple_card_premium.png',
        poison: '/images/cards/poison_apple_card_final.png'
      };
      return finalCards[appleType];
    }
  };

  const timeRemaining = Math.max(0, 24 * 60 * 60 - ((Date.now() - drawTime) / 1000));
  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = Math.floor(timeRemaining % 60);

  return (
    <div className="apple-reveal">
      <Image
        src={getRevealImage()}
        alt="りんごカード"
        width={600}
        height={840}
        priority
      />
      <div className="countdown">
        残り時間: {hours}時間 {minutes}分 {seconds}秒
      </div>
      <div className="progress-bar">
        <div className="progress" style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );
};

export default AppleReveal;
```

---

## 3. チャットボットアイコン（icons/）

### 使用場所
- 右下のチャットボットボタン（64px版）
- チャットウィンドウのヘッダー（128px版）

### ファイル一覧

| ファイル名 | サイズ | 使用場所 |
|-----------|--------|---------|
| `ringo_chan_chatbot_icon_64.png` | 64x64px | チャットボットボタン |
| `ringo_chan_chatbot_icon_128.png` | 128x128px | チャットウィンドウヘッダー |

### 実装例（Next.js）

```javascript
// components/Chatbot.js
import { useState } from 'react';
import Image from 'next/image';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* チャットボットボタン（右下固定） */}
      <button
        className="chatbot-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Image
          src="/images/icons/ringo_chan_chatbot_icon_64.png"
          alt="りんごちゃん"
          width={64}
          height={64}
        />
      </button>

      {/* チャットウィンドウ */}
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <Image
              src="/images/icons/ringo_chan_chatbot_icon_128.png"
              alt="りんごちゃん"
              width={48}
              height={48}
            />
            <h3>りんごちゃん</h3>
          </div>
          <div className="chatbot-messages">
            {/* メッセージ表示 */}
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
```

---

## 4. TOPページキャラクター（character/）

### 使用場所
- TOPページのヒーローセクション
- ログインページ
- 404ページ

### ファイル一覧

| ファイル名 | 説明 |
|-----------|------|
| `ringo_kai_main_character.png` | TOPページのりんごキャラクター |

### 実装例（Next.js）

```javascript
// pages/index.js
import Image from 'next/image';

const HomePage = () => {
  return (
    <div className="hero-section">
      <Image
        src="/images/character/ringo_kai_main_character.png"
        alt="りんご会♪"
        width={400}
        height={400}
        priority
      />
      <h1>りんご会♪</h1>
      <p>欲しいものを交換し合う、楽しいコミュニティ</p>
      <button>新規登録</button>
    </div>
  );
};

export default HomePage;
```

---

## Next.jsプロジェクトへの配置方法

### ステップ1：assetsディレクトリをNext.jsプロジェクトにコピー

```bash
# Next.jsプロジェクトのpublicディレクトリにコピー
cp -r ringo_kai_assets/* /path/to/nextjs-project/public/images/
```

### ステップ2：ディレクトリ構成の確認

```
nextjs-project/
└── public/
    └── images/
        ├── cards/
        │   ├── bronze_apple_card_v2.png
        │   ├── silver_apple_card_final.png
        │   ├── gold_apple_card_v2.png
        │   ├── red_apple_card_premium.png
        │   └── poison_apple_card_final.png
        ├── reveal_stages/
        │   ├── reveal_stage1_common.png
        │   ├── reveal_stage2_clean.png
        │   ├── reveal_stage3_clean.png
        │   ├── bronze_stage4_clean.png
        │   ├── silver_stage4_clean.png
        │   ├── gold_stage4_clean.png
        │   ├── red_stage4_clean.png
        │   └── poison_stage4_clean.png
        ├── icons/
        │   ├── ringo_chan_chatbot_icon_64.png
        │   └── ringo_chan_chatbot_icon_128.png
        └── character/
            └── ringo_kai_main_character.png
```

### ステップ3：画像の最適化（オプション）

Next.jsの`next/image`コンポーネントを使用すると、自動的に画像が最適化されます。

```javascript
import Image from 'next/image';

<Image
  src="/images/cards/bronze_apple_card_v2.png"
  alt="ブロンズりんごカード"
  width={600}
  height={840}
  priority // 重要な画像の場合
/>
```

---

## 画像サイズとフォーマット

| カテゴリ | サイズ | フォーマット | 最適化 |
|---------|--------|------------|--------|
| 完成版カード | 約600x840px | PNG | ✅ |
| 段階的イラスト | 約600x840px | PNG | ✅ |
| チャットボットアイコン | 64x64px, 128x128px | PNG | ✅ |
| TOPページキャラクター | 約400x400px | PNG | ✅ |

---

## トラブルシューティング

### 画像が表示されない場合

1. **ファイルパスを確認**
   ```javascript
   // ❌ 間違い
   src="images/cards/bronze_apple_card_v2.png"
   
   // ✅ 正しい
   src="/images/cards/bronze_apple_card_v2.png"
   ```

2. **ファイル名を確認**
   - ファイル名は大文字・小文字を区別します
   - スペースやアンダースコアを確認してください

3. **Next.jsの開発サーバーを再起動**
   ```bash
   npm run dev
   ```

---

## まとめ

- **合計16枚のイラスト・アイコン**
- **すべてテキスト・ラベルなし**
- **Claude Codeがすぐに使用できる状態**

このガイドに従って実装すれば、「りんご会♪」の完璧なビジュアル体験を実現できます。
