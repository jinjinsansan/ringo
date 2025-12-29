-- Add verification columns to purchases table
-- ocr_snapshot: stores OCR extraction results from screenshot verification
-- verification_metadata: stores additional metadata from AI verification process

ALTER TABLE purchases 
  ADD COLUMN IF NOT EXISTS ocr_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS verification_metadata JSONB;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_purchases_verification_status 
  ON purchases(verification_status);

CREATE INDEX IF NOT EXISTS idx_purchases_status_created 
  ON purchases(status, created_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN purchases.ocr_snapshot IS 'OCR extraction results: item_name, order_id, price, confidence, matched_name, matched_price';
COMMENT ON COLUMN purchases.verification_metadata IS 'AI verification metadata: model, evaluated_at, etc.';
