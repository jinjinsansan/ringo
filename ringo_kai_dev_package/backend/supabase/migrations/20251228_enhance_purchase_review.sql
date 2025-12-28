-- Purchase verification enhancements

alter table public.purchases
    add column if not exists ocr_snapshot jsonb,
    add column if not exists verification_metadata jsonb;

create index if not exists idx_purchases_ocr_snapshot on public.purchases using gin (ocr_snapshot);
