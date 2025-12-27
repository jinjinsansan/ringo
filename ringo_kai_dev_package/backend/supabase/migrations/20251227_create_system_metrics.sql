create table if not exists public.system_metrics (
    id bigserial primary key,
    captured_at timestamptz not null default timezone('utc', now()),
    total_users integer not null,
    new_users_this_month integer not null,
    active_users integer not null,
    total_purchase_obligation integer not null,
    total_purchase_available integer not null,
    current_rtp numeric not null,
    predicted_rtp numeric not null,
    growth_rate numeric not null,
    bronze_probability numeric not null,
    silver_probability numeric not null,
    gold_probability numeric not null,
    red_probability numeric not null,
    poison_probability numeric not null
);

create index if not exists system_metrics_captured_at_idx on public.system_metrics (captured_at desc);
