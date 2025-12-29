-- Ensure apples table stores remaining purchase obligation/available counts

ALTER TABLE apples
    ADD COLUMN IF NOT EXISTS purchase_obligation INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS purchase_available INT DEFAULT 0;

-- Backfill existing rows to avoid NULLs (in case defaults are not applied automatically)
UPDATE apples
SET
    purchase_obligation = COALESCE(purchase_obligation, 0),
    purchase_available = COALESCE(purchase_available, 0)
WHERE
    purchase_obligation IS NULL OR purchase_available IS NULL;
