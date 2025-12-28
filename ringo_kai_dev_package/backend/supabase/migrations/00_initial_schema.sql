-- りんご会♪ 初期スキーマ (Supabase)

-- ============================================================================
-- 1. テーブル作成
-- ============================================================================

-- users テーブル
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- User Flow Status
    status VARCHAR(50) DEFAULT 'registered',
    terms_agreed_at TIMESTAMPTZ,
    tutorial_completed_at TIMESTAMPTZ,
    wishlist_url TEXT,
    wishlist_registered_at TIMESTAMPTZ,
    
    -- Apple Economy
    apple_draw_rights INT DEFAULT 0,
    purchase_obligation INT DEFAULT 0,
    purchase_available INT DEFAULT 0,
    
    -- Referral & Anti-abuse
    referral_code VARCHAR(10) UNIQUE,
    referred_by UUID REFERENCES users(id),
    referral_count INT DEFAULT 0,
    silver_gold_completed_count INT DEFAULT 0,
    last_silver_gold_completed_at TIMESTAMPTZ
);

-- purchases テーブル
CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    purchaser_id UUID NOT NULL REFERENCES users(id),
    target_user_id UUID NOT NULL REFERENCES users(id),
    target_wishlist_url TEXT NOT NULL,
    target_item_name TEXT NOT NULL,
    target_item_price INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    screenshot_url TEXT,
    verification_status VARCHAR(50),
    verification_result TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ
);

-- apples テーブル
CREATE TABLE IF NOT EXISTS apples (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    purchase_id INT NOT NULL REFERENCES purchases(id),
    apple_type VARCHAR(50) NOT NULL,
    draw_time TIMESTAMPTZ DEFAULT NOW(),
    reveal_time TIMESTAMPTZ,
    is_revealed BOOLEAN DEFAULT FALSE,
    is_consumed BOOLEAN DEFAULT FALSE
);

-- referrals テーブル
CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES users(id),
    referred_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. インデックス作成
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_purchases_purchaser_id ON purchases(purchaser_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_apples_user_id ON apples(user_id);
CREATE INDEX IF NOT EXISTS idx_apples_is_revealed ON apples(is_revealed);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);

-- ============================================================================
-- 3. RLS (Row Level Security) ポリシー
-- ============================================================================

-- users テーブル: 自分のレコードのみ読み書き可能
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can read own data"
ON users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update own data"
ON users FOR UPDATE
USING (auth.uid() = id);

-- purchases テーブル: 自分が関係する購入のみ閲覧可能
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can read own purchases"
ON purchases FOR SELECT
USING (auth.uid() = purchaser_id OR auth.uid() = target_user_id);

-- apples テーブル: 自分のりんごのみ閲覧可能
ALTER TABLE apples ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can read own apples"
ON apples FOR SELECT
USING (auth.uid() = user_id);

-- referrals テーブル: 自分が関係する紹介のみ閲覧可能
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can read own referrals"
ON referrals FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- ============================================================================
-- 4. Supabase Storage バケット作成
-- ============================================================================

-- purchase-screenshots バケットを作成（公開アクセス有効）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'purchase-screenshots',
    'purchase-screenshots',
    true,
    10485760, -- 10MB
    ARRAY['image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. Storage RLS ポリシー
-- ============================================================================

-- サービスキーでのアップロード許可（認証不要）
CREATE POLICY IF NOT EXISTS "Allow service role to upload screenshots"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'purchase-screenshots');

-- サービスキーでの更新許可
CREATE POLICY IF NOT EXISTS "Allow service role to update screenshots"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'purchase-screenshots');

-- 公開読み取り許可
CREATE POLICY IF NOT EXISTS "Public read access to screenshots"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'purchase-screenshots');

-- 認証済みユーザーが自分のスクリーンショットをアップロード可能
CREATE POLICY IF NOT EXISTS "Authenticated users can upload own screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'purchase-screenshots' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);
